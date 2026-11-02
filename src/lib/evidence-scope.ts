import type { ScfApiClient } from "./api-client.js";
import { ScfApiError } from "./errors.js";

/**
 * Scope-aware view of one evidence item: which of the organisation's in-scope
 * controls require it, next to the catalogue's global mapping.
 *
 * The SCF catalogue maps an evidence item to controls globally (`control_mappings`);
 * that list says nothing about the organisation. The requirement is a property of
 * scope — the platform's `in_scope_evidence_requests`: a control requires the evidence
 * when its scoped-control row is `selected`, whatever its implementation status. The
 * web app's evidence page used to show the catalogue list labelled "the controls this
 * artifact is mapped to" next to a "required by" count computed from scope, and the
 * two disagreed whenever only some mapped controls were in scope.
 *
 * The platform serves this join at
 * `GET /organizations/{org_id}/evidence/{evidence_id}/requiring-controls`. A platform
 * without that route answers 404 "Not Found" (FastAPI's unknown-route body), and this
 * module then composes the same shape from the catalogue entry and the paginated
 * scoped-controls listing, using the same rule, and says so in `source`.
 */

export const EVIDENCE_SCOPE_RULE =
  "A control requires this evidence when the organisation's scoped-control row for it is selected (in scope), " +
  "whatever its implementation status: not_applicable and deferred controls are listed with that status rather " +
  "than dropped. catalog_control_mappings is the SCF's global mapping and is not scope.";

export interface RequiringControl {
  scf_id: string;
  control_name: string | null;
  implementation_status: string | null;
  maturity_level: string | null;
  scope_override: string | null;
}

export interface EvidenceRequiringControls {
  evidence_id: string;
  artifact_title: string | null;
  artifact_description: string | null;
  area_of_focus: string | null;
  catalog_status: string | null;
  scope_rule: string;
  required_by_scope: boolean;
  /** Primary view: in-scope controls that require this evidence, scf_id order. */
  required_by_in_scope_controls: RequiringControl[];
  /** Secondary context: the SCF catalogue's global mapping — not the organisation's scope. */
  catalog_control_mappings: string[];
  /** catalog_control_mappings entries that no in-scope control turns into a requirement. */
  catalog_mappings_not_in_scope: string[];
  /** Who computed the join: the platform's route, or this server from the catalogue + scoped controls. */
  source: "platform" | "mcp-composition";
}

interface CatalogEvidenceEntry {
  evidence_id?: string;
  artifact_title?: string | null;
  artifact_description?: string | null;
  area_of_focus?: string | null;
  catalog_status?: string | null;
  control_mappings?: unknown;
}

interface ScopedControlListItem {
  scf_id: string;
  control_name?: string | null;
  selected?: boolean;
  implementation_status?: string | null;
  maturity_level?: string | null;
  scope_override?: string | null;
  evidence_requests?: unknown;
}

interface ScopedControlsPage {
  total?: number;
  controls?: ScopedControlListItem[];
}

type Client = Pick<ScfApiClient, "get">;

const PAGE_SIZE = 200;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
}

/** FastAPI answers an unknown route with `{"detail":"Not Found"}`; a known route that misses answers with its own detail. */
export function isMissingRoute(error: unknown): boolean {
  return error instanceof ScfApiError && error.statusCode === 404 && error.message === "Not Found";
}

/**
 * Compose the join on a platform that predates the route. Same rule as the platform: a
 * selected scoped control whose catalogue `evidence_requests` names the evidence. The
 * scoped-controls listing is read per domain of the catalogue mapping (an evidence item
 * mapped only to AST-* controls is requested by AST-* controls), so a cross-domain
 * requester the catalogue mapping omits is not seen here; the platform route is
 * authoritative where it exists.
 */
async function composeRequiringControls(
  client: Client,
  orgId: string,
  evidenceId: string,
): Promise<EvidenceRequiringControls> {
  const catalog = await client.get<CatalogEvidenceEntry>(`/catalog/evidence/${evidenceId}`);
  const mappings = stringList(catalog.control_mappings);
  const domains = [...new Set(mappings.map((scfId) => scfId.split("-")[0]).filter((d) => d.length > 0))];

  const requiring = new Map<string, RequiringControl>();
  for (const domain of domains) {
    let offset = 0;
    for (;;) {
      const page = await client.get<ScopedControlsPage>(`/organizations/${orgId}/scoped-controls-paginated`, {
        scope_status: "in_scope",
        domain,
        limit: PAGE_SIZE,
        offset,
      });
      const rows = page.controls ?? [];
      for (const row of rows) {
        if (row.selected === false) continue;
        // The platform's definition reads the control's evidence_requests; fall back to the
        // evidence's own mapping only when the listing carries no evidence_requests at all.
        const requests = Array.isArray(row.evidence_requests) ? stringList(row.evidence_requests) : null;
        const requires = requests ? requests.includes(evidenceId) : mappings.includes(row.scf_id);
        if (!requires) continue;
        requiring.set(row.scf_id, {
          scf_id: row.scf_id,
          control_name: row.control_name ?? null,
          implementation_status: row.implementation_status ?? null,
          maturity_level: row.maturity_level ?? null,
          scope_override: row.scope_override ?? null,
        });
      }
      offset += rows.length;
      if (rows.length === 0 || rows.length < PAGE_SIZE || offset >= (page.total ?? 0)) break;
    }
  }

  const controls = [...requiring.values()].sort((a, b) => a.scf_id.localeCompare(b.scf_id));
  return {
    evidence_id: catalog.evidence_id ?? evidenceId,
    artifact_title: catalog.artifact_title ?? null,
    artifact_description: catalog.artifact_description ?? null,
    area_of_focus: catalog.area_of_focus ?? null,
    catalog_status: catalog.catalog_status ?? null,
    scope_rule: EVIDENCE_SCOPE_RULE,
    required_by_scope: controls.length > 0,
    required_by_in_scope_controls: controls,
    catalog_control_mappings: mappings,
    catalog_mappings_not_in_scope: mappings.filter((scfId) => !requiring.has(scfId)),
    source: "mcp-composition",
  };
}

/**
 * The in-scope controls that require an evidence item for an organisation, with the
 * catalogue mapping as labelled secondary context. Prefers the platform's route; composes
 * the same shape on a platform that does not have it yet.
 */
export async function fetchEvidenceRequiringControls(
  client: Client,
  orgId: string,
  evidenceId: string,
): Promise<EvidenceRequiringControls> {
  const id = evidenceId.trim().toUpperCase();
  try {
    const data = await client.get<Omit<EvidenceRequiringControls, "source">>(
      `/organizations/${orgId}/evidence/${id}/requiring-controls`,
    );
    return { ...data, scope_rule: data.scope_rule ?? EVIDENCE_SCOPE_RULE, source: "platform" };
  } catch (error) {
    if (!isMissingRoute(error)) throw error;
    return composeRequiringControls(client, orgId, id);
  }
}
