import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const ImplementationStatus = z.enum([
  "not_started",
  "in_progress",
  "implemented",
  "ready_for_review",
  "monitored",
  "not_applicable",
  "at_risk",
  "deferred",
]);

const MaturityLevel = z.enum(["L0", "L1", "L2", "L3", "L4", "L5"]);

const ScopeStatus = z.enum(["in_scope", "out_of_scope", "all"]);

const AccountableOwnerType = z.enum(["internal", "external_contractor"]);

// An individual control's override of whatever the framework selection implies
// for it. 'inherit' is not a no-op — it clears a previously set override and
// hands the control back to the framework rollup.
const ScopeOverrideAction = z.enum(["include", "exclude", "inherit"]);

// Obligation basis (PIG R2): mcr = mandatory compliance requirement, dsr =
// discretionary security requirement. The list filter adds 'unclassified'.
const ObligationBasis = z.enum(["mcr", "dsr"]);
const ObligationType = z.enum(["statutory", "regulatory", "contractual", "discretionary"]);

const MATERIAL_RULE =
  "A material control (catalogue weighting 10, or set material by an admin) can only leave scope through scf_set_scope_override by an admin (other paths 409), and only an admin may mark it not_applicable (403 otherwise).";

export function registerScopedControlTools(server: McpServer) {
  server.tool(
    "scf_list_scoped_controls",
    "List controls scoped to the organization with status, basis, target maturity, materiality, procedure and last validation. Filter by scope, domain, framework, team, basis, material. Paginated.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scope_status: ScopeStatus.optional().describe(
        "Scope filter: 'in_scope' (selected), 'out_of_scope' (deselected), or 'all' (default — everything)",
      ),
      domain: z.string().optional().describe("SCF domain code (e.g., 'GOV', 'AST', 'IAC')"),
      framework: z.string().optional().describe("Framework slug (e.g., 'nist-800-53') to filter mapped controls"),
      csf_function: z
        .string()
        .optional()
        .describe("NIST CSF function: 'GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', or 'RECOVER'"),
      control_weighting: z.number().int().min(0).max(10).optional().describe("Weighting threshold on a 0–10 scale"),
      search: z.string().optional().describe("Free-text filter applied to control ID, name, or description"),
      team_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter to controls this team is assigned to, accountable or consulted — obtain from scf_list_teams"),
      my_teams: z
        .boolean()
        .default(false)
        .describe(
          "Filter to controls assigned to any team the caller belongs to; intersects with team_id rather than overriding it." +
            " 'The caller' is the API key's identity; on a self-hosted instance that is a service account on no team, so this returns nothing — use team_id instead.",
        ),
      function_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter to controls assigned to any team aligned to this function — obtain from scf_list_functions"),
      accountable_owner_type: AccountableOwnerType.optional().describe(
        "Filter by the accountable team's primary owner: 'internal' or 'external_contractor'",
      ),
      basis: z
        .enum(["mcr", "dsr", "unclassified"])
        .optional()
        .describe(
          "Filter by obligation basis: 'mcr', 'dsr', or 'unclassified' (no classified framework and no override). Each row carries obligation_basis, basis_source (override | framework) and basis_override_reason",
        ),
      material: z
        .boolean()
        .optional()
        .describe(
          "Filter by materiality: true for material controls (catalogue weighting 10, or an admin override), false for the rest. Rows carry material, material_source (control | weighting) and material_reason",
        ),
      sort: z
        .enum(["scf_id", "weighting"])
        .default("scf_id")
        .describe(
          "Order: 'scf_id' (default), or 'weighting' — material controls first, then catalogue weighting highest first, then scf_id." +
            " Rows also carry target_maturity, target_source (control | domain), target_maturity_reason, procedure_document_id, procedure_document_status," +
            " last_validated_at, last_validated_by and last_validation_note",
        ),
      limit: z.number().int().min(1).max(200).default(50).describe("Page size (1–200, default 50)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset — number of results to skip (default 0)"),
    },
    { title: "List Scoped Controls", readOnlyHint: true },
    async ({
      org_id,
      scope_status,
      domain,
      framework,
      csf_function,
      control_weighting,
      search,
      team_id,
      my_teams,
      function_id,
      accountable_owner_type,
      basis,
      material,
      sort,
      limit,
      offset,
    }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls-paginated`, {
          scope_status,
          domain,
          framework,
          csf_function,
          control_weighting,
          search,
          team_id,
          my_teams,
          function_id,
          accountable_owner_type,
          basis,
          material,
          sort,
          limit,
          offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_scoped_control",
    "Get one scoped control: owner, notes, scope/basis/target/material overrides with reason, set_at and set_by, procedure_document_id, last validation. Identify by scf_id, not UUID.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z
        .string()
        .describe("SCF control identifier in DOMAIN-NN format (e.g., 'AST-01', 'GOV-02') — NOT the UUID"),
    },
    { title: "Get Scoped Control", readOnlyHint: true },
    async ({ org_id, scf_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls/${scf_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_scoped_control",
    "Update a scoped control's implementation fields (write — editor+). Identify by scf_id. Only provided fields apply. Material controls: admin for not_applicable. at_risk raises a deficiency.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z
        .string()
        .describe("SCF control identifier in DOMAIN-NN format (e.g., 'AST-01', 'GOV-02') — NOT the UUID"),
      implementation_status: ImplementationStatus.optional().describe(
        "New implementation status (lowercase): not_started, in_progress, implemented, ready_for_review, monitored, not_applicable, at_risk, or deferred. " +
          "Moving to at_risk raises a deficiency (see scf_list_deficiencies). " +
          MATERIAL_RULE,
      ),
      priority: z.string().optional().describe("Implementation priority: 'high', 'medium', or 'low'"),
      maturity_level: MaturityLevel.optional().describe(
        "Maturity level with L prefix: L0 Not Performed, L1 Performed, L2 Planned, L3 Well Defined, L4 Quantitatively Controlled, L5 Continuously Improving",
      ),
      owner: z.string().optional().describe("Accountable owner of the control"),
      assigned_to: z.string().optional().describe("Assignee responsible for implementation"),
      implementation_notes: z.string().optional().describe("Free-text implementation notes and context"),
      target_date: z.string().optional().describe("Target completion date in ISO-8601 (YYYY-MM-DD)"),
      completion_date: z.string().optional().describe("Actual completion date in ISO-8601 (YYYY-MM-DD)"),
      selection_reason: z
        .string()
        .optional()
        .describe("Justification for scoping decision — required for not_applicable or deferred"),
    },
    { title: "Update Scoped Control", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, ...fields }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/scoped-controls/${scf_id}`, fields);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_scoping_stats",
    "Get the organization's implementation statistics: counts by status, overall completion percentage, and per-framework coverage breakdown.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Scoping Stats", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls/stats`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_scope_framework",
    "Bulk-scope every control mapped to a framework into the organization (write — editor+ role). Creates a scoped-control entry for each control in the framework.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      framework_id: z
        .string()
        .describe("Framework slug to scope (e.g., 'nist-800-53-r5') — obtain from scf_list_frameworks"),
    },
    { title: "Scope Framework", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, framework_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/scoped-controls/bulk-scope-framework`, {
          framework_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_batch_update_controls",
    "Batch-update up to 500 scoped controls in one transaction (write — editor+). Each operation targets an scf_id. Material/MCR controls: no deselect (409); at_risk raises a deficiency.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      operations: z
        .array(
          z.object({
            scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format (required, e.g., 'AST-01')"),
            selected: z
              .boolean()
              .optional()
              .describe(
                "Toggle in-scope membership. Deselecting an MCR-basis or material control is refused (409) — use scf_set_scope_override",
              ),
            implementation_status: ImplementationStatus.optional().describe(
              "Implementation status (lowercase): not_started, in_progress, implemented, ready_for_review, monitored, not_applicable, at_risk, deferred. " +
                "at_risk raises a deficiency; not_applicable on a material control needs an admin (403)",
            ),
            selection_reason: z
              .string()
              .optional()
              .describe("Justification for selection — required for not_applicable or deferred"),
            priority: z.string().optional().describe("Implementation priority: 'high', 'medium', or 'low'"),
            owner: z.string().optional().describe("Accountable owner of the control"),
            assigned_to: z.string().optional().describe("Assignee responsible for implementation"),
            maturity_level: MaturityLevel.optional().describe(
              "Maturity level with L prefix: L0 Not Performed, L1 Performed, L2 Planned, L3 Well Defined, L4 Quantitatively Controlled, L5 Continuously Improving",
            ),
            target_date: z.string().optional().describe("Target date in ISO-8601 (YYYY-MM-DD)"),
            completion_date: z.string().optional().describe("Completion date in ISO-8601 (YYYY-MM-DD)"),
            implementation_notes: z.string().optional().describe("Free-text implementation notes"),
          }),
        )
        .min(1)
        .max(500)
        .describe("Update operations to apply (1–500 per call)"),
    },
    { title: "Batch Update Controls", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, operations }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/scoped-controls/batch`, { operations });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_bulk_unscope_framework",
    "Unscope every control mapped only to these frameworks (destructive write — editor). Shared controls are kept. An MCR framework, or one taking out a material control, needs an admin and a reason.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      frameworks: z
        .array(z.string())
        .min(1)
        .describe("Framework slugs to remove, e.g. ['iso_27017_2015'] — obtain from scf_list_frameworks"),
      removal_reason: z
        .string()
        .optional()
        .describe(
          "Why these controls leave scope — recorded in the audit trail. Required (400 without it), with an admin key (403 otherwise), when a framework carries an MCR obligation or its removal would take a material control out of scope",
        ),
    },
    { title: "Bulk Unscope Framework", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, frameworks, removal_reason }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/scoped-controls/bulk-unscope-framework`, {
          frameworks,
          removal_reason,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_framework_scope_summary",
    "Get framework coverage and selection state (read — viewer): each framework's coverage, basis, obligation_type and obligation_source, and basis_counts (in-scope controls by mcr/dsr/unclassified).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Framework Scope Summary", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/framework-scoping`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_preview_framework_scope_change",
    "Preview adding or removing frameworks WITHOUT applying it (read — viewer): controls entering or leaving scope, orphaned evidence, and on remove basis_downgrades (controls whose basis weakens).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      operation: z
        .enum(["add", "remove"])
        .describe("'add' to preview scoping these frameworks in, 'remove' to preview taking them out"),
      frameworks: z.array(z.string()).min(1).describe("Framework slugs to model — obtain from scf_list_frameworks"),
    },
    { title: "Preview Framework Scope Change", readOnlyHint: true },
    async ({ org_id, operation, frameworks }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/framework-scoping/preview`, {
          operation,
          frameworks,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_scope_override",
    "Force one control in or out of scope (write — editor+). 'include'/'exclude' pin it; 'inherit' clears it. Excluding an MCR or material control needs an admin key and a reason (editors 403).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls"),
      action: ScopeOverrideAction.describe(
        "'include' pins the control in scope, 'exclude' pins it out, 'inherit' clears the override AND discards the recorded rationale (it stays in the audit trail)",
      ),
      reason: z
        .string()
        .max(2000)
        .optional()
        .describe(
          "Why this control is being overridden — recorded in the audit trail (max 2000 characters). Required for 'exclude'. The admin making an MCR or material exclusion is recorded as its approver; there is no approver parameter",
        ),
    },
    { title: "Set Scope Override", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, action, reason }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/scoped-controls/${scf_id}/scope-override`, {
          action,
          reason,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ===========================================================================
  // Obligation basis, target maturity, materiality, procedure (PIG R2, R5, R6)
  // ===========================================================================

  server.tool(
    "scf_set_framework_basis",
    "Record why a scoped framework is in scope (write — ADMIN role): basis mcr|dsr, obligation_type and obligation_source. Replaces all three; null clears. Only an active (scoped) framework, else 404.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      framework_id: z
        .string()
        .min(1)
        .describe("Framework slug of a framework the org has scoped — obtain from scf_get_framework_scope_summary"),
      basis: ObligationBasis.nullable().describe(
        "'mcr' (mandatory compliance requirement) or 'dsr' (discretionary security requirement); null leaves it unclassified. Reclassifying MCR to DSR changes which exclusions need an approver, hence admin-only",
      ),
      obligation_type: ObligationType.nullable()
        .optional()
        .describe(
          "Where the obligation comes from: statutory, regulatory, contractual or discretionary; omitted or null clears it",
        ),
      obligation_source: z
        .string()
        .max(2000)
        .nullable()
        .optional()
        .describe("The law, regulation or contract behind it (max 2000 characters); omitted, null or blank clears it"),
    },
    { title: "Set Framework Basis", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, framework_id, basis, obligation_type, obligation_source }) => {
      try {
        const client = getClient();
        // The platform replaces all three fields, so send each explicitly: an omitted one is a clear.
        const data = await client.put(`/organizations/${org_id}/framework-scoping/${framework_id}/basis`, {
          basis,
          obligation_type: obligation_type ?? null,
          obligation_source: obligation_source ?? null,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_control_basis_override",
    "Override one control's derived obligation basis (write — ADMIN role): mcr or dsr with a reason, or null to clear and derive it from its frameworks again. 404 if the control has no scope record.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls"),
      basis: ObligationBasis.nullable().describe(
        "'mcr' or 'dsr' to override; null clears the override (and its reason) so the basis is derived from the org's classified frameworks again",
      ),
      reason: z
        .string()
        .max(2000)
        .optional()
        .describe("Why the derived basis is wrong for this control (max 2000 characters) — required when basis is set"),
    },
    { title: "Set Control Basis Override", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, basis, reason }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/scoped-controls/${scf_id}/basis-override`, {
          basis,
          reason,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_target_maturity",
    "Override one control's target maturity (write — ADMIN role): a level L0–L5 with a reason, or null to inherit its domain's target again (domain targets: scf_update_org_settings).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls"),
      level: MaturityLevel.nullable().describe(
        "Target CMM level L0–L5 for this control; null clears the override (and its reason) and the control inherits its domain target",
      ),
      reason: z
        .string()
        .max(2000)
        .optional()
        .describe("Why this control departs from its domain target (max 2000 characters) — required when level is set"),
    },
    { title: "Set Target Maturity", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, level, reason }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/scoped-controls/${scf_id}/target-maturity`, {
          level,
          reason,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_control_materiality",
    "Set whether one control is material (write — ADMIN's own key; a platform key gets 403): true/false with a reason, or null for the catalogue default (material at weighting 10).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls"),
      material: z
        .boolean()
        .nullable()
        .describe(
          "true or false overrides the catalogue default; null clears the override. The admin is recorded as the approver: deciding a control is not material lets it be excluded or marked not_applicable without one",
        ),
      reason: z
        .string()
        .max(2000)
        .optional()
        .describe(
          "Why (max 2000 characters). Required when material is true or false, and when a null clear makes a control weighted below 10 not material (400 otherwise)",
        ),
    },
    { title: "Set Control Materiality", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, material, reason }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/scoped-controls/${scf_id}/materiality`, {
          material,
          reason,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_control_procedure",
    "Link one control to its signed-off procedure document, or null to unlink (write — editor+). The document must be this org's procedure, approved or published when linked (400 otherwise).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls"),
      document_id: z
        .string()
        .uuid()
        .nullable()
        .describe(
          "Procedure document UUID — obtain from scf_list_documents; null unlinks. A later edit sends the document back to review; the link stays and scf_list_scoped_controls shows procedure_document_status",
        ),
    },
    { title: "Set Control Procedure", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, document_id }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/scoped-controls/${scf_id}/procedure-document`, {
          document_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
