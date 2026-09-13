import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerRiskTools(server: McpServer) {
  server.tool(
    "scf_list_risks",
    "List risk assessments in the organization's risk register. Returns each risk's likelihood, impact, treatment status, and linked controls.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      status: z
        .string()
        .optional()
        .describe("Filter by treatment status (e.g., 'mitigate', 'accept', 'transfer', 'avoid')"),
      page: z.number().int().min(1).default(1).describe("1-indexed page number (default 1)"),
      per_page: z.number().int().min(1).max(100).default(25).describe("Page size (1–100, default 25)"),
    },
    { title: "List Risks", readOnlyHint: true },
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
    "Get one risk assessment in detail: likelihood, inherent and residual impact scores, treatment plan, owner, and review date.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_id: z.string().describe("Risk assessment ID — obtain from scf_list_risks"),
    },
    { title: "Get Risk", readOnlyHint: true },
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
    "Create a new risk assessment in the risk register (write — editor+ role). Likelihood and impact scores populate the 5×5 risk matrix.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      title: z.string().describe("Risk title (required, max ~100 chars)"),
      description: z.string().describe("Risk description (required)"),
      likelihood: z.number().int().min(1).max(5).describe("Inherent likelihood on a 1–5 scale"),
      impact: z.number().int().min(1).max(5).describe("Inherent impact on a 1–5 scale"),
      owner: z.string().optional().describe("Name or identifier of the risk owner"),
      treatment_status: z
        .enum(["identified", "analysed", "treating", "treated", "accepted", "monitoring"])
        .optional()
        .describe("Treatment workflow status (default identified)"),
      control_id: z
        .string()
        .optional()
        .describe("SCF control ID to link (e.g., 'AST-01') — obtain from scf_list_controls"),
    },
    { title: "Create Risk", readOnlyHint: false, destructiveHint: false },
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
    "Get the 5×5 risk matrix data for the organization — risk distribution across likelihood × impact, ready for visualization.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Risk Matrix", readOnlyHint: true },
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
    "Get the organization's aggregate risk summary: totals by severity, treatment status breakdown, and trend data.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Risk Summary", readOnlyHint: true },
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
    "List the organization's custom risk definitions — org-defined risks alongside the static SCF catalog, carrying auto-generated R-ORG-N codes.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "List Custom Risks", readOnlyHint: true },
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
    "Create a custom org-defined risk (write — editor+ role). Auto-generates an R-ORG-N code and creates the matching risk assessment record.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      title: z.string().max(100).describe("Risk title (required, max 100 chars)"),
      description: z.string().describe("Risk description (required)"),
      category_name: z.string().optional().describe("Category label shown in UI (default 'Custom')"),
      category_color: z
        .string()
        .optional()
        .describe("Hex color for the category badge, e.g., '#6b7280' (default '#6b7280')"),
    },
    { title: "Create Custom Risk", readOnlyHint: false, destructiveHint: false },
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
    "Update a custom risk definition's metadata — title, description, category (write — editor+ role). Only provided fields are applied.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z
        .string()
        .describe("Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks"),
      title: z.string().max(100).optional().describe("New risk title (max 100 chars)"),
      description: z.string().optional().describe("New risk description"),
      category_name: z.string().optional().describe("New category label"),
      category_color: z.string().optional().describe("New hex color for the category badge"),
    },
    { title: "Update Custom Risk", readOnlyHint: false, destructiveHint: false },
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
    "Delete a custom risk definition, its assessment record, and every control mapping (destructive write — editor+ role). Irreversible.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z
        .string()
        .describe("Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks"),
    },
    { title: "Delete Custom Risk", readOnlyHint: false, destructiveHint: true },
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
    "List controls linked to a custom risk. Returns `catalog_control_ids` plus `scoped_controls` with implementation status — same shape as the built-in controls-for-risk endpoint.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z
        .string()
        .describe("Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks"),
    },
    { title: "List Custom Risk Controls", readOnlyHint: true },
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
    "Link a scoped control to a custom risk (write — editor+ role). The control must already be scoped (in-scope) for this organization.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z
        .string()
        .describe("Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks"),
      scf_id: z.string().describe("SCF control ID to link (e.g., 'AST-01') — obtain from scf_list_scoped_controls"),
    },
    { title: "Add Custom Risk Control", readOnlyHint: false, destructiveHint: false },
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
    "Unlink a scoped control from a custom risk (write — editor+ role). The control and risk both remain; only the mapping is removed.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z
        .string()
        .describe("Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks"),
      scf_id: z
        .string()
        .describe("SCF control ID to unlink (e.g., 'AST-01') — obtain from scf_list_custom_risk_controls"),
    },
    { title: "Remove Custom Risk Control", readOnlyHint: false, destructiveHint: true },
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

  // ===========================================================================
  // Risk Assessment Maintenance
  // ===========================================================================

  server.tool(
    "scf_update_risk_assessment",
    "Update a scored risk by its code (write — editor role). Only passed fields change: inherent and residual likelihood/impact 1–5, treatment status and plan, due and review dates, owner, notes.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z.string().describe("Risk code — catalog R-XX-N or custom R-ORG-N"),
      likelihood: z.number().int().min(1).max(5).optional().describe("Inherent likelihood on a 1–5 scale"),
      impact: z.number().int().min(1).max(5).optional().describe("Inherent impact on a 1–5 scale"),
      residual_likelihood: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("Residual likelihood after treatment, 1–5 scale"),
      residual_impact: z.number().int().min(1).max(5).optional().describe("Residual impact after treatment, 1–5 scale"),
      treatment_status: z
        .enum(["identified", "analysed", "treating", "treated", "accepted", "monitoring"])
        .optional()
        .describe("Treatment lifecycle state"),
      treatment_plan: z.string().optional().describe("How the risk is being treated"),
      treatment_due_date: z.string().optional().describe("YYYY-MM-DD"),
      next_review_date: z.string().optional().describe("YYYY-MM-DD"),
      owner_user_id: z.string().uuid().optional().describe("Risk owner — obtain from scf_list_members"),
      notes: z.string().optional().describe("Free-text notes on this risk assessment"),
    },
    { title: "Update Risk Assessment", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, risk_code, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.patch(`/organizations/${org_id}/risk-assessments/${risk_code}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_risk_assessment",
    "Delete an organization's scoring of a risk code (destructive write — editor role). The catalog or custom risk definition itself remains; only this org's assessment row is removed.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z.string().describe("Risk code — catalog R-XX-N or custom R-ORG-N"),
    },
    { title: "Delete Risk Assessment", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, risk_code }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/risk-assessments/${risk_code}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ===========================================================================
  // Risk ↔ Control Traceability
  // ===========================================================================

  server.tool(
    "scf_get_risks_for_control",
    "List the risk codes a control addresses and this organization's assessments of them (read — viewer role). Control-to-risk traceability from the SCF catalog mapping.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control ID in DOMAIN-NN format, e.g. IAC-01"),
    },
    { title: "Get Risks For Control", readOnlyHint: true },
    async ({ org_id, scf_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/risks-for-control/${scf_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_controls_for_risk",
    "List the controls that address a risk code (read — viewer role). Works for catalog risks (R-XX-N via the SCF mapping) and custom risks (R-ORG-N via the org's control mappings).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      risk_code: z.string().describe("Risk code — catalog R-XX-N or custom R-ORG-N"),
    },
    { title: "Get Controls For Risk", readOnlyHint: true },
    async ({ org_id, risk_code }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/controls-for-risk/${risk_code}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_risk_profile",
    "Get the organization's risk profile (read — viewer role): the severity thresholds that band the 5×5 matrix into low, medium, high and critical. Auto-created with defaults if unset.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Risk Profile", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/risk-profile`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
