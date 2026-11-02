import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ScfApiError } from "../src/lib/errors.js";

// A route-keyed fake client: each GET answers from `routes` (a value, or a thrown error),
// and every call is recorded so a test can assert which platform routes were read.
type Params = Record<string, unknown> | undefined;
const calls: Array<{ path: string; params: Params }> = [];
let routes: Record<string, unknown | ((params: Params) => unknown)> = {};
const fakeClient = {
  get: vi.fn(async (path: string, params?: Params) => {
    calls.push({ path, params });
    if (!(path in routes)) throw new ScfApiError("Not Found", 404);
    const answer = routes[path];
    const value = typeof answer === "function" ? (answer as (p: Params) => unknown)(params) : answer;
    if (value instanceof Error) throw value;
    return value;
  }),
};
vi.mock("../src/lib/api-client.js", () => ({ getClient: () => fakeClient }));

import { fetchEvidenceRequiringControls, isMissingRoute, EVIDENCE_SCOPE_RULE } from "../src/lib/evidence-scope.js";
import { registerEvidenceTools } from "../src/tools/evidence.js";

type Handler = (args: Record<string, unknown>) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

function handlersOf(register: (s: McpServer) => void): Map<string, Handler> {
  const map = new Map<string, Handler>();
  const server = { tool: (name: string, ...rest: unknown[]) => map.set(name, rest[rest.length - 1] as Handler) };
  register(server as unknown as McpServer);
  return map;
}

const ORG = "11111111-1111-4111-8111-111111111111";
const REQUIRING = `/organizations/${ORG}/evidence/E-AST-09/requiring-controls`;
const CATALOG = "/catalog/evidence/E-AST-09";
const PAGINATED = `/organizations/${ORG}/scoped-controls-paginated`;

/** The E-AST-09 case: the catalogue maps it to four AST controls; the org has AST-39 in scope. */
const catalogEntry = {
  evidence_id: "E-AST-09",
  artifact_title: "Computer Lifecycle Plan",
  artifact_description: "Plan covering procurement through disposal",
  area_of_focus: "Asset Management",
  catalog_status: "active",
  control_mappings: ["AST-37", "AST-38", "AST-39", "AST-40"],
};
const scopedRow = (scf_id: string, extra: Record<string, unknown> = {}) => ({
  scf_id,
  control_name: `Control ${scf_id}`,
  selected: true,
  implementation_status: "implemented",
  maturity_level: "L3",
  scope_override: null,
  evidence_requests: ["E-AST-09"],
  ...extra,
});
const platformAnswer = {
  evidence_id: "E-AST-09",
  artifact_title: "Computer Lifecycle Plan",
  artifact_description: "Plan covering procurement through disposal",
  area_of_focus: "Asset Management",
  catalog_status: "active",
  scope_rule: "platform rule text",
  required_by_scope: true,
  required_by_in_scope_controls: [
    {
      scf_id: "AST-39",
      control_name: "Technology Lifecycle Management",
      implementation_status: "implemented",
      maturity_level: "L3",
      scope_override: null,
    },
  ],
  catalog_control_mappings: ["AST-37", "AST-38", "AST-39", "AST-40"],
  catalog_mappings_not_in_scope: ["AST-37", "AST-38", "AST-40"],
};

beforeEach(() => {
  calls.length = 0;
  routes = {};
});

describe("fetchEvidenceRequiringControls", () => {
  it("prefers the platform's requiring-controls route and labels the source", async () => {
    routes = { [REQUIRING]: platformAnswer };
    const out = await fetchEvidenceRequiringControls(fakeClient, ORG, "E-AST-09");
    expect(out).toEqual({ ...platformAnswer, source: "platform" });
    expect(calls.map((c) => c.path)).toEqual([REQUIRING]);
  });

  it("upper-cases the evidence id before calling the platform", async () => {
    routes = { [REQUIRING]: platformAnswer };
    await fetchEvidenceRequiringControls(fakeClient, ORG, " e-ast-09 ");
    expect(calls[0].path).toBe(REQUIRING);
  });

  it("four catalogue mappings with one in scope → one requiring control, three not in scope (composed)", async () => {
    routes = {
      [CATALOG]: catalogEntry,
      [PAGINATED]: {
        total: 2,
        controls: [scopedRow("AST-39"), scopedRow("AST-12", { evidence_requests: ["E-AST-01"] })],
      },
    };
    const out = await fetchEvidenceRequiringControls(fakeClient, ORG, "E-AST-09");
    expect(out.source).toBe("mcp-composition");
    expect(out.required_by_scope).toBe(true);
    expect(out.required_by_in_scope_controls).toEqual([
      {
        scf_id: "AST-39",
        control_name: "Control AST-39",
        implementation_status: "implemented",
        maturity_level: "L3",
        scope_override: null,
      },
    ]);
    expect(out.catalog_control_mappings).toEqual(["AST-37", "AST-38", "AST-39", "AST-40"]);
    expect(out.catalog_mappings_not_in_scope).toEqual(["AST-37", "AST-38", "AST-40"]);
    expect(out.scope_rule).toBe(EVIDENCE_SCOPE_RULE);
    expect(out.artifact_title).toBe("Computer Lifecycle Plan");
    // Fell through the platform route to the catalogue, then read in-scope AST controls only.
    expect(calls.map((c) => c.path)).toEqual([REQUIRING, CATALOG, PAGINATED]);
    expect(calls[2].params).toEqual({ scope_status: "in_scope", domain: "AST", limit: 200, offset: 0 });
  });

  it("keeps not_applicable and deferred controls, with their status, when composing", async () => {
    routes = {
      [CATALOG]: catalogEntry,
      [PAGINATED]: {
        total: 2,
        controls: [
          scopedRow("AST-40", { implementation_status: "not_applicable", maturity_level: null }),
          scopedRow("AST-39", { implementation_status: "deferred" }),
        ],
      },
    };
    const out = await fetchEvidenceRequiringControls(fakeClient, ORG, "E-AST-09");
    expect(out.required_by_in_scope_controls.map((c) => [c.scf_id, c.implementation_status])).toEqual([
      ["AST-39", "deferred"],
      ["AST-40", "not_applicable"],
    ]);
    expect(out.catalog_mappings_not_in_scope).toEqual(["AST-37", "AST-38"]);
  });

  it("uses the control's evidence_requests, not the evidence's mapping, when the listing carries it", async () => {
    routes = {
      [CATALOG]: catalogEntry,
      // AST-38 is in the catalogue mapping but its own evidence_requests do not name E-AST-09.
      [PAGINATED]: { total: 1, controls: [scopedRow("AST-38", { evidence_requests: ["E-AST-03"] })] },
    };
    const out = await fetchEvidenceRequiringControls(fakeClient, ORG, "E-AST-09");
    expect(out.required_by_in_scope_controls).toEqual([]);
    expect(out.required_by_scope).toBe(false);
    expect(out.catalog_mappings_not_in_scope).toEqual(["AST-37", "AST-38", "AST-39", "AST-40"]);
  });

  it("falls back to the evidence's mapping only when the listing has no evidence_requests field", async () => {
    routes = {
      [CATALOG]: catalogEntry,
      [PAGINATED]: { total: 1, controls: [scopedRow("AST-37", { evidence_requests: undefined })] },
    };
    const out = await fetchEvidenceRequiringControls(fakeClient, ORG, "E-AST-09");
    expect(out.required_by_in_scope_controls.map((c) => c.scf_id)).toEqual(["AST-37"]);
  });

  it("pages through a domain larger than one page and reads every mapped domain", async () => {
    const bigPage = (offset: number) =>
      Array.from({ length: offset === 0 ? 200 : 50 }, (_, i) =>
        scopedRow(`IAC-${offset + i + 1}`, { evidence_requests: offset + i + 1 === 230 ? ["E-IAC-07"] : [] }),
      );
    routes = {
      ["/catalog/evidence/E-IAC-07"]: {
        ...catalogEntry,
        evidence_id: "E-IAC-07",
        control_mappings: ["IAC-230", "GOV-01"],
      },
      [PAGINATED]: (params: Params) =>
        params?.domain === "IAC"
          ? { total: 250, controls: bigPage(params.offset as number) }
          : { total: 1, controls: [scopedRow("GOV-01", { evidence_requests: ["E-IAC-07"] })] },
    };
    const out = await fetchEvidenceRequiringControls(fakeClient, ORG, "E-IAC-07");
    expect(out.required_by_in_scope_controls.map((c) => c.scf_id)).toEqual(["GOV-01", "IAC-230"]);
    const pages = calls.filter((c) => c.path === PAGINATED).map((c) => [c.params?.domain, c.params?.offset]);
    expect(pages).toEqual([
      ["IAC", 0],
      ["IAC", 200],
      ["GOV", 0],
    ]);
  });

  it("an evidence id the platform does not know is an error, not a composition", async () => {
    routes = { [REQUIRING]: new ScfApiError("Evidence E-AST-09 not found in catalog", 404) };
    await expect(fetchEvidenceRequiringControls(fakeClient, ORG, "E-AST-09")).rejects.toThrow("not found in catalog");
    expect(calls).toHaveLength(1);
  });

  it("isMissingRoute matches only FastAPI's unknown-route 404", () => {
    expect(isMissingRoute(new ScfApiError("Not Found", 404))).toBe(true);
    expect(isMissingRoute(new ScfApiError("Evidence X not found", 404))).toBe(false);
    expect(isMissingRoute(new ScfApiError("Not Found", 403))).toBe(false);
    expect(isMissingRoute(new Error("Not Found"))).toBe(false);
  });
});

describe("evidence tools are scope-aware", () => {
  it("scf_get_evidence_requiring_controls returns the join", async () => {
    routes = { [REQUIRING]: platformAnswer };
    const h = handlersOf(registerEvidenceTools).get("scf_get_evidence_requiring_controls")!;
    const res = await h({ org_id: ORG, evidence_id: "E-AST-09" });
    expect(res.isError).toBeUndefined();
    const body = JSON.parse(res.content[0].text);
    expect(body.required_by_in_scope_controls.map((c: { scf_id: string }) => c.scf_id)).toEqual(["AST-39"]);
    expect(body.catalog_mappings_not_in_scope).toEqual(["AST-37", "AST-38", "AST-40"]);
    expect(body.source).toBe("platform");
  });

  it("scf_get_evidence attaches the in-scope controls to the tracking record", async () => {
    const tracking = { id: "t-1", evidence_id: "E-AST-09", is_tracked: true, required_by_scope: true };
    routes = { [`/organizations/${ORG}/evidence-tracking/E-AST-09`]: tracking, [REQUIRING]: platformAnswer };
    const h = handlersOf(registerEvidenceTools).get("scf_get_evidence")!;
    const body = JSON.parse((await h({ org_id: ORG, evidence_id: "E-AST-09" })).content[0].text);
    expect(body).toMatchObject(tracking);
    expect(body.required_by_in_scope_controls.map((c: { scf_id: string }) => c.scf_id)).toEqual(["AST-39"]);
    expect(body.catalog_control_mappings).toEqual(["AST-37", "AST-38", "AST-39", "AST-40"]);
    expect(body.catalog_mappings_not_in_scope).toEqual(["AST-37", "AST-38", "AST-40"]);
    expect(body.in_scope_controls_source).toBe("platform");
  });

  it("scf_get_evidence still returns the tracking record when the scope lookup fails", async () => {
    const tracking = { id: "t-1", evidence_id: "E-AST-09", is_tracked: true };
    routes = {
      [`/organizations/${ORG}/evidence-tracking/E-AST-09`]: tracking,
      [CATALOG]: new ScfApiError("boom", 500),
    };
    const h = handlersOf(registerEvidenceTools).get("scf_get_evidence")!;
    const res = await h({ org_id: ORG, evidence_id: "E-AST-09" });
    expect(res.isError).toBeUndefined();
    const body = JSON.parse(res.content[0].text);
    expect(body).toMatchObject(tracking);
    expect(body.in_scope_controls_error).toContain("boom");
    expect(body.required_by_in_scope_controls).toBeUndefined();
  });

  it("scf_get_evidence is a 404 when the item is not tracked", async () => {
    routes = { [REQUIRING]: platformAnswer };
    const h = handlersOf(registerEvidenceTools).get("scf_get_evidence")!;
    const res = await h({ org_id: ORG, evidence_id: "E-AST-09" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Not found");
  });

  it("no evidence tool description calls the catalogue mapping the controls the artifact is mapped to", () => {
    const descriptions: string[] = [];
    const server = { tool: (_n: string, d: string) => descriptions.push(d) };
    registerEvidenceTools(server as unknown as McpServer);
    for (const d of descriptions) {
      expect(d).not.toMatch(/controls? (this|the) artifact is mapped to/i);
      expect(d).not.toMatch(/linked controls/i);
    }
  });
});
