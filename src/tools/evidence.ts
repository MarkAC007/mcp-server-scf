import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerEvidenceTools(server: McpServer) {
  server.tool(
    "list_evidence",
    "List evidence items tracked for an organization's controls. Evidence demonstrates control implementation for audit readiness.",
    {
      org_id: z.string().describe("Organization ID"),
      control_id: z.string().optional().describe("Filter by scoped control ID"),
      status: z.string().optional().describe("Filter by evidence status"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ org_id, control_id, status, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence`, {
          control_id,
          status,
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
    "create_evidence",
    "Create a new evidence item linked to a control. Evidence items track artifacts that demonstrate control implementation.",
    {
      org_id: z.string().describe("Organization ID"),
      control_id: z.string().describe("Scoped control ID to link evidence to"),
      title: z.string().describe("Evidence title"),
      description: z.string().optional().describe("Evidence description"),
      evidence_type: z.string().optional().describe("Type of evidence (e.g., 'document', 'screenshot', 'log')"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_evidence_maturity",
    "Get evidence maturity scores for an organization. Shows how well evidence collection is progressing across controls.",
    {
      org_id: z.string().describe("Organization ID"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/evidence-maturity/summary/${org_id}`);
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
      org_id: z.string().optional().describe("Organization ID"),
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
