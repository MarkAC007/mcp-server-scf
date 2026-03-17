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

export function registerScopedControlTools(server: McpServer) {
  server.tool(
    "list_scoped_controls",
    "List controls scoped to your organization with their implementation status. Supports filtering by scope status, domain, framework, CSF function, control weighting, and search. Use scope_status='in_scope' to return only controls where selected=True. Returns paginated results. Pagination uses limit/offset.",
    {
      org_id: z.string().describe("Organization ID (UUID)"),
      scope_status: ScopeStatus.optional().describe("Filter by scoping status: 'in_scope' (selected=True only), 'out_of_scope' (not selected), 'all' (default — returns everything)"),
      domain: z.string().optional().describe("Filter by SCF domain (e.g., 'GOV', 'AST', 'IAC')"),
      framework: z.string().optional().describe("Filter by framework mapping"),
      csf_function: z.string().optional().describe("Filter by NIST CSF function"),
      control_weighting: z.number().min(0).max(10).optional().describe("Filter by control weighting (0-10)"),
      search: z.string().optional().describe("Search term to filter by control ID, name, or description"),
      limit: z.number().min(1).max(200).default(50).describe("Number of results to return (max 200)"),
      offset: z.number().min(0).default(0).describe("Number of results to skip for pagination"),
    },
    async ({ org_id, scope_status, domain, framework, csf_function, control_weighting, search, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls-paginated`, {
          scope_status,
          domain,
          framework,
          csf_function,
          control_weighting,
          search,
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
    "get_scoped_control",
    "Get detailed implementation status of a specific scoped control, including owner, notes, evidence links, and audit history. Use the scf_id (e.g., 'AST-01') as the identifier.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      scf_id: z.string().describe("SCF control identifier (e.g., 'AST-01', 'GOV-02') — NOT the UUID"),
    },
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
    "update_scoped_control",
    "Update a scoped control's implementation tracking fields. Use the scf_id (e.g., 'AST-01', 'GOV-02') as the identifier — NOT the UUID. Status values are lowercase (e.g., 'not_started', 'in_progress'). All fields are optional — only provided fields are updated.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      scf_id: z.string().describe("SCF control identifier (e.g., 'AST-01', 'GOV-02') — NOT the UUID"),
      implementation_status: ImplementationStatus.optional().describe("New implementation status (lowercase: not_started, in_progress, implemented, ready_for_review, monitored, not_applicable, at_risk, deferred)"),
      priority: z.string().optional().describe("Implementation priority (e.g., 'high', 'medium', 'low')"),
      maturity_level: MaturityLevel.optional()
        .describe("Control maturity level — must use L prefix format (L0=Not Performed, L1=Performed, L2=Planned, L3=Well Defined, L4=Quantitatively Controlled, L5=Continuously Improving)"),
      owner: z.string().optional().describe("Control owner (person accountable)"),
      assigned_to: z.string().optional().describe("Assignee (person responsible for implementation)"),
      implementation_notes: z.string().optional().describe("Implementation notes and context"),
      target_date: z.string().optional().describe("Target completion date (YYYY-MM-DD)"),
      completion_date: z.string().optional().describe("Actual completion date (YYYY-MM-DD)"),
      selection_reason: z.string().optional().describe("Justification for scoping selection or status (required for not_applicable, deferred)"),
    },
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
    "get_scoping_stats",
    "Get implementation statistics for an organization — counts by status, completion percentage, framework coverage breakdown.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
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
    "scope_framework",
    "Bulk-scope all controls from a framework to your organization. This creates scoped control entries for every control in the selected framework.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      framework_id: z.string().describe("Framework ID to scope (e.g., 'nist-800-53-r5')"),
    },
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
    "batch_update_controls",
    "Batch update multiple scoped controls in a single transaction. Maximum 500 operations per request. Use scf_id (e.g., 'AST-01') to identify controls. Status values must be lowercase.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      operations: z
        .array(
          z.object({
            scf_id: z.string().describe("SCF control identifier (e.g., 'AST-01') — required"),
            selected: z.boolean().optional().describe("Whether the control is in scope"),
            implementation_status: ImplementationStatus.optional().describe("Implementation status (lowercase)"),
            selection_reason: z.string().optional().describe("Justification for selection or status"),
            priority: z.string().optional().describe("Implementation priority"),
            owner: z.string().optional().describe("Control owner"),
            assigned_to: z.string().optional().describe("Assignee"),
            maturity_level: MaturityLevel.optional()
              .describe("Control maturity level — must use L prefix format (L0=Not Performed, L1=Performed, L2=Planned, L3=Well Defined, L4=Quantitatively Controlled, L5=Continuously Improving)"),
            target_date: z.string().optional().describe("Target date (YYYY-MM-DD)"),
            completion_date: z.string().optional().describe("Completion date (YYYY-MM-DD)"),
            implementation_notes: z.string().optional().describe("Implementation notes"),
          }),
        )
        .min(1)
        .max(500)
        .describe("Array of update operations"),
    },
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
}
