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

export function registerScopedControlTools(server: McpServer) {
  server.tool(
    "list_scoped_controls",
    "List controls scoped to your organization with their implementation status. Supports filtering by status, domain, framework, and search. Returns paginated implementation progress across the 8-state workflow. Pagination uses limit/offset.",
    {
      org_id: z.string().describe("Organization ID (UUID)"),
      scope_status: ImplementationStatus.optional().describe("Filter by implementation status (e.g., 'not_started', 'in_progress', 'implemented')"),
      domain: z.string().optional().describe("Filter by SCF domain (e.g., 'GOV', 'AST', 'IAC')"),
      framework: z.string().optional().describe("Filter by framework"),
      search: z.string().optional().describe("Search term to filter by control ID or title"),
      limit: z.number().min(1).max(100).default(25).describe("Number of results to return (max 100)"),
      offset: z.number().min(0).default(0).describe("Number of results to skip for pagination"),
    },
    async ({ org_id, scope_status, domain, framework, search, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls-paginated`, {
          scope_status,
          domain,
          framework,
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
      maturity_level: z.string().optional().describe("Control maturity level"),
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
            maturity_level: z.string().optional().describe("Control maturity level"),
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
