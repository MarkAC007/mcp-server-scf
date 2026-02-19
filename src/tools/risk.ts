import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerRiskTools(server: McpServer) {
  server.tool(
    "list_risks",
    "List risk assessments in the organization's risk register. Returns risks with likelihood, impact, treatment status, and linked controls.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      status: z.string().optional().describe("Filter by treatment status"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ org_id, status, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/risk-assessments`, { status, page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_risk",
    "Get detailed risk assessment including likelihood, impact scores (inherent and residual), treatment plan, owner, and review date.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      risk_id: z.string().describe("Risk assessment ID"),
    },
    async ({ org_id, risk_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/risk-assessments/${risk_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "create_risk",
    "Create a new risk assessment in the risk register. Requires likelihood and impact scores for the 5x5 risk matrix.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      title: z.string().describe("Risk title"),
      description: z.string().describe("Risk description"),
      likelihood: z.number().min(1).max(5).describe("Inherent likelihood (1-5)"),
      impact: z.number().min(1).max(5).describe("Inherent impact (1-5)"),
      owner: z.string().optional().describe("Risk owner"),
      treatment_status: z.string().optional().describe("Treatment status (e.g., 'mitigate', 'accept', 'transfer', 'avoid')"),
      control_id: z.string().optional().describe("Linked control ID"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/risk-assessments`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_risk_matrix",
    "Get the 5x5 risk matrix visualization data for the organization. Shows risk distribution across likelihood and impact dimensions.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/risk-matrix`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_risk_summary",
    "Get aggregated risk summary for the organization — total risks by severity, treatment status breakdown, and trend data.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/risk-summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
