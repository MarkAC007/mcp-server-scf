import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const ImplementationStatus = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "READY_FOR_REVIEW",
  "MONITORED",
  "NOT_APPLICABLE",
  "AT_RISK",
  "DEFERRED",
]);

export function registerScopedControlTools(server: McpServer) {
  server.tool(
    "list_scoped_controls",
    "List controls scoped to your organization with their implementation status. Supports filtering by status, framework, and search. Returns implementation progress across the 8-state workflow.",
    {
      org_id: z.string().describe("Organization ID"),
      status: ImplementationStatus.optional().describe("Filter by implementation status"),
      framework: z.string().optional().describe("Filter by framework"),
      search: z.string().optional().describe("Search term"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ org_id, status, framework, search, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls`, {
          status,
          framework,
          search,
          page,
          per_page,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_scoped_control",
    "Get detailed implementation status of a specific scoped control, including owner, notes, evidence links, and audit history.",
    {
      org_id: z.string().describe("Organization ID"),
      scoped_control_id: z.string().describe("Scoped control ID"),
    },
    async ({ org_id, scoped_control_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/scoped-controls/${scoped_control_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "update_scoped_control",
    "Update a scoped control's implementation tracking fields. Status transitions are validated (e.g., NOT_STARTED -> IN_PROGRESS -> IMPLEMENTED). All fields are optional — only provided fields are updated.",
    {
      org_id: z.string().describe("Organization ID"),
      scoped_control_id: z.string().describe("Scoped control ID"),
      implementation_status: ImplementationStatus.optional().describe("New implementation status"),
      priority: z.string().optional().describe("Implementation priority (e.g., 'high', 'medium', 'low')"),
      maturity_level: z.string().optional().describe("Control maturity level"),
      owner: z.string().optional().describe("Control owner (person accountable)"),
      assigned_to: z.string().optional().describe("Assignee (person responsible for implementation)"),
      implementation_notes: z.string().optional().describe("Implementation notes and context"),
      target_date: z.string().optional().describe("Target completion date (YYYY-MM-DD)"),
      completion_date: z.string().optional().describe("Actual completion date (YYYY-MM-DD)"),
      selection_reason: z.string().optional().describe("Justification for scoping selection or status (required for NOT_APPLICABLE, DEFERRED)"),
    },
    async ({ org_id, scoped_control_id, ...fields }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/scoped-controls/${scoped_control_id}`, fields);
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
      org_id: z.string().describe("Organization ID"),
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
      org_id: z.string().describe("Organization ID"),
      framework_id: z.string().describe("Framework ID to scope (e.g., 'nist-800-53-r5')"),
    },
    async ({ org_id, framework_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/scoped-controls/scope-framework`, {
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
    "Batch update multiple scoped controls in a single transaction. Maximum 500 operations per request. Useful for bulk status changes or assignments.",
    {
      org_id: z.string().describe("Organization ID"),
      operations: z
        .array(
          z.object({
            scoped_control_id: z.string().describe("Scoped control ID"),
            status: ImplementationStatus.optional(),
            owner: z.string().optional(),
            notes: z.string().optional(),
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
