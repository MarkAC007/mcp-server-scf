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

export function registerScopedControlTools(server: McpServer) {
  server.tool(
    "scf_list_scoped_controls",
    "List controls scoped to the organization with implementation status. Filter by scope status, domain, framework, CSF function, weighting, or free-text search. Paginated.",
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
    "Get one scoped control in detail: owner, implementation notes, evidence links, and audit history. Identify by scf_id, not by UUID.",
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
    "Update a scoped control's implementation fields (write — editor+ role). Identify by scf_id, not UUID. Only provided fields are applied.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z
        .string()
        .describe("SCF control identifier in DOMAIN-NN format (e.g., 'AST-01', 'GOV-02') — NOT the UUID"),
      implementation_status: ImplementationStatus.optional().describe(
        "New implementation status (lowercase): not_started, in_progress, implemented, ready_for_review, monitored, not_applicable, at_risk, or deferred",
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
    "Batch-update up to 500 scoped controls in one transaction (write — editor+ role). Each operation identifies its target by scf_id; status values are lowercase.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      operations: z
        .array(
          z.object({
            scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format (required, e.g., 'AST-01')"),
            selected: z.boolean().optional().describe("Toggle in-scope membership"),
            implementation_status: ImplementationStatus.optional().describe(
              "Implementation status (lowercase): not_started, in_progress, implemented, ready_for_review, monitored, not_applicable, at_risk, deferred",
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
    "Remove from scope every control mapped only to the given frameworks (destructive write — editor role). Controls shared with another in-scope framework are kept; notes and status survive.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      frameworks: z
        .array(z.string())
        .min(1)
        .describe("Framework slugs to remove, e.g. ['iso_27017_2015'] — obtain from scf_list_frameworks"),
      removal_reason: z.string().optional().describe("Why these controls leave scope — recorded in the audit trail"),
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
    "Get framework coverage and selection state in one view (read — viewer role): which frameworks are selected and how their controls sit against the scope. Read side of scoping; changing it is elsewhere.",
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
    "Preview what adding or removing frameworks would do to the scope WITHOUT applying it (read — viewer role). Returns the controls that would enter or leave, so the blast radius is known beforehand.",
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
    "Force one control in or out of scope whatever its frameworks imply (write — editor+). 'include'/'exclude' pin it; 'inherit' clears the override back to the framework rollup. Scope only, not status.",
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
        .describe("Why this control is being overridden — recorded in the audit trail (max 2000 characters)"),
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
}
