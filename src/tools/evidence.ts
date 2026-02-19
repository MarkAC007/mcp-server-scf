import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerEvidenceTools(server: McpServer) {
  server.tool(
    "list_evidence",
    "List evidence items tracked for an organization's controls. Evidence demonstrates control implementation for audit readiness. Returns evidence with status, maturity, and linked controls.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      system_id: z.string().optional().describe("Filter by system ID"),
    },
    async ({ org_id, system_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-tracking`, {
          system_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "create_evidence",
    "Create a new evidence item linked to a control. Evidence items track artifacts that demonstrate control implementation.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      control_id: z.string().optional().describe("Scoped control ID to link evidence to"),
      title: z.string().describe("Evidence title"),
      description: z.string().optional().describe("Evidence description"),
      evidence_type: z.string().optional().describe("Type of evidence (e.g., 'document', 'screenshot', 'log')"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence-tracking`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_evidence_maturity",
    "Get evidence maturity summary for an organization. Shows average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-maturity-summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_evidence_tasks",
    "List evidence collection tasks — the work queue for gathering evidence. Shows what needs to be collected, by whom, and by when.",
    {
      org_id: z.string().optional().describe("Organization ID (UUID)"),
      assignee: z.string().optional().describe("Filter by assigned user"),
      status: z.string().optional().describe("Filter by task status"),
    },
    async ({ org_id, assignee, status }) => {
      try {
        const client = getClient();
        const data = await client.get("/evidence-tasks", { org_id, assignee, status });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
