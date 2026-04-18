import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerRiskTools(server: McpServer) {
  server.tool(
    "scf_list_risks",
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
    "scf_get_risk",
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
    "scf_create_risk",
    "Create a new risk assessment in the risk register. Requires likelihood and impact scores for the 5x5 risk matrix.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      title: z.string().describe("Risk title"),
      description: z.string().describe("Risk description"),
      likelihood: z.number().min(1).max(5).describe("Inherent likelihood (1-5)"),
      impact: z.number().min(1).max(5).describe("Inherent impact (1-5)"),
      owner: z.string().optional().describe("Risk owner"),
      treatment_status: z
        .string()
        .optional()
        .describe("Treatment status (e.g., 'mitigate', 'accept', 'transfer', 'avoid')"),
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
    "scf_get_risk_matrix",
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
    "scf_get_risk_summary",
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

  // ===========================================================================
  // Custom Risk Definitions
  // ===========================================================================

  server.tool(
    "scf_list_custom_risks",
    "List custom (organization-defined) risk definitions. These are risks created by the org alongside the static SCF risk catalog, with auto-generated R-ORG-N codes.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/custom-risks`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_custom_risk",
    "Create a custom organization-defined risk. Auto-generates an R-ORG-N code and creates the corresponding risk assessment record.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      title: z.string().describe("Risk title (max 100 chars)"),
      description: z.string().describe("Risk description"),
      category_name: z.string().optional().describe("Category label (default: 'Custom')"),
      category_color: z.string().optional().describe("Hex color for category badge (default: '#6b7280')"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/custom-risks`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_custom_risk",
    "Update a custom risk definition's metadata (title, description, category).",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      risk_code: z.string().describe("Custom risk code (e.g., 'R-ORG-1')"),
      title: z.string().optional().describe("Updated risk title"),
      description: z.string().optional().describe("Updated risk description"),
      category_name: z.string().optional().describe("Updated category label"),
      category_color: z.string().optional().describe("Updated hex color"),
    },
    async ({ org_id, risk_code, ...body }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/custom-risks/${risk_code}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_custom_risk",
    "Delete a custom risk definition and its assessment record. Also removes any control mappings.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      risk_code: z.string().describe("Custom risk code (e.g., 'R-ORG-1')"),
    },
    async ({ org_id, risk_code }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/custom-risks/${risk_code}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ===========================================================================
  // Custom Risk Control Mappings
  // ===========================================================================

  server.tool(
    "scf_list_custom_risk_controls",
    "List controls manually linked to a custom risk. Returns the same shape as controls-for-risk (catalog_control_ids + scoped_controls with implementation status).",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      risk_code: z.string().describe("Custom risk code (e.g., 'R-ORG-1')"),
    },
    async ({ org_id, risk_code }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/custom-risks/${risk_code}/controls`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_add_custom_risk_control",
    "Link a scoped control to a custom risk. The control must be scoped (selected) for this organization.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      risk_code: z.string().describe("Custom risk code (e.g., 'R-ORG-1')"),
      scf_id: z.string().describe("SCF control ID to link (e.g., 'AST-01')"),
    },
    async ({ org_id, risk_code, scf_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/custom-risks/${risk_code}/controls`, { scf_id });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_remove_custom_risk_control",
    "Remove a control link from a custom risk.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      risk_code: z.string().describe("Custom risk code (e.g., 'R-ORG-1')"),
      scf_id: z.string().describe("SCF control ID to unlink (e.g., 'AST-01')"),
    },
    async ({ org_id, risk_code, scf_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/custom-risks/${risk_code}/controls/${scf_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
