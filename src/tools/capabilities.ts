import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const SystemType = z.enum([
  "cloud_provider",
  "identity_provider",
  "ticketing",
  "logging",
  "security_tool",
  "code_repository",
  "document_management",
  "custom",
]);

export function registerCapabilityTools(server: McpServer) {
  server.tool(
    "scf_list_capability_themes",
    "List an organization's 11 KSI capability themes. Themes group NIST 800-53 controls into security capability areas for a high-level posture view.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-themes`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_capabilities",
    "List an organization's capabilities. Capabilities map to systems and evidence, showing what security functions the infrastructure supports.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-capabilities`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_systems",
    "List the organization's infrastructure systems — the tools and platforms that implement security capabilities. Optionally filter by linked vendor.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter to systems structurally linked to this vendor UUID — obtain from scf_list_vendors"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/systems`, { vendor_id });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_system",
    "Create a system in the organization's infrastructure inventory (write — editor+ role). Systems can be linked to capabilities and evidence.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      name: z.string().describe("Human-readable system name (required)"),
      description: z.string().optional().describe("Free-text description of the system"),
      system_type: SystemType.describe(
        "System classification: cloud_provider, identity_provider, ticketing, logging, security_tool, code_repository, document_management, or custom",
      ),
      status: z
        .enum(["active", "inactive", "deprecated"])
        .default("active")
        .describe("Lifecycle status (default: active)"),
      vendor: z.string().optional().describe("Legacy free-text vendor name (prefer vendor_id for a structural link)"),
      vendor_id: z
        .string()
        .uuid()
        .optional()
        .describe("Vendor UUID to structurally link this system to — obtain from scf_list_vendors (same org)"),
      catalog_template_id: z
        .number()
        .int()
        .optional()
        .describe("System-catalog template ID to link — obtain from scf_list_system_catalog"),
      category: z.string().optional().describe("Free-text category (e.g., 'SIEM', 'Endpoint', 'Identity')"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/systems`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_system",
    "Update an existing system record (write — editor+ role). All fields are optional; only provided fields are applied.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      system_id: z.string().uuid().describe("System UUID to update — obtain from scf_list_systems"),
      name: z.string().optional().describe("New system name"),
      description: z.string().optional().describe("New system description"),
      system_type: SystemType.optional().describe("New system classification"),
      status: z.enum(["active", "inactive", "deprecated"]).optional().describe("New lifecycle status"),
      vendor: z.string().optional().describe("New legacy free-text vendor name (prefer vendor_id)"),
      vendor_id: z
        .string()
        .uuid()
        .optional()
        .describe("New structural vendor link (UUID, same org) — obtain from scf_list_vendors"),
      catalog_template_id: z
        .number()
        .int()
        .optional()
        .describe("New system-catalog template ID link — obtain from scf_list_system_catalog"),
      category: z.string().optional().describe("New free-text category"),
    },
    async ({ org_id, system_id, ...fields }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/systems/${system_id}`, fields);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // KSI (Capability Theme) Scoring — issue #50
  // Wraps multi-axis endpoints shipped in scf-controls-platform #549 Phase 1.
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_get_capability_theme_scorecard",
    "Get the multi-axis KSI scorecard for every capability theme. Returns per-theme Implementation Coverage, Maturity, Evidence Coverage, Evidence Quality, and composite KSI Posture Score bands.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-themes/scorecard`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_capability_theme",
    "Get a single capability theme (KSI) with full posture, multi-axis scores, band, and legacy posture_percentage.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      theme_code: z
        .string()
        .describe(
          "Capability theme code (e.g., 'ACCESS_CONTROL', 'INCIDENT_RESPONSE') — obtain from scf_list_capability_themes",
        ),
    },
    async ({ org_id, theme_code }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-themes/${theme_code}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_capability_theme_controls",
    "List SCF controls mapped to a capability theme (KSI), with scoping status, implementation status, and maturity level. Supports pagination and scope filtering — ideal for KSI drill-down.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      theme_code: z
        .string()
        .describe("Capability theme code (e.g., 'ACCESS_CONTROL') — obtain from scf_list_capability_themes"),
      scope_status: z
        .enum(["in_scope", "out_of_scope", "all"])
        .optional()
        .default("in_scope")
        .describe("Filter by scoping status (default: in_scope)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(50)
        .describe("Max results per page (1–200, default 50)"),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("Pagination offset — number of results to skip (default 0)"),
    },
    async ({ org_id, theme_code, scope_status, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-themes/${theme_code}/controls`, {
          scope_status,
          limit,
          offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // System knowledge catalog + evidence recipes — scf-controls-platform #689
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_list_system_catalog",
    "List system-catalog templates — the platform's knowledge base of known vendors/tools (slug, vendor, type, recipe maturity levels). Optionally search by name.",
    {
      search: z.string().optional().describe("Free-text search across template names, vendors, and aliases"),
    },
    async ({ search }) => {
      try {
        const client = getClient();
        const data = await client.get(`/system-catalog`, { search });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_system_catalog_template",
    "Get one system-catalog template by slug with full detail: aliases and curated evidence-collection recipes (maturity level, steps, frequency, estimated time).",
    {
      slug: z.string().describe("Template slug — obtain from scf_list_system_catalog"),
    },
    async ({ slug }) => {
      try {
        const client = getClient();
        const data = await client.get(`/system-catalog/${slug}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_system_recipes",
    "Get evidence-collection recipes for a system, matched via its catalog template, alias, or fallback. Returns matched_via, the template summary, and per-maturity-level recipe steps.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      system_id: z.string().uuid().describe("System UUID — obtain from scf_list_systems"),
    },
    async ({ org_id, system_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/systems/${system_id}/recipes`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_generate_system_recipes",
    "Queue AI generation of evidence-collection recipes for a system (write — editor+ role, async, HTTP 202). Poll scf_get_recipe_generation_status for progress.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      system_id: z.string().uuid().describe("System UUID — obtain from scf_list_systems"),
    },
    async ({ org_id, system_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/systems/${system_id}/generate-recipes`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_recipe_generation_status",
    "Get the status of a queued AI recipe-generation job for a system. Poll this after scf_generate_system_recipes.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      system_id: z.string().uuid().describe("System UUID — obtain from scf_list_systems"),
    },
    async ({ org_id, system_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/systems/${system_id}/generate-recipes/status`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_capability_theme_evidence_posture",
    "Get per-theme evidence metrics: controls with evidence, file counts by assessment status, average relevance score, and derived confidence (strong/moderate/weak/none). Use for KSI evidence dashboards.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-themes/evidence-posture`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
