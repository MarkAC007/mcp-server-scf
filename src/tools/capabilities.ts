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
    "List the 11 KSI-aligned capability themes for an organization. Capability themes group NIST 800-53 controls into security capability areas, providing a high-level view of security posture.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
    "List capabilities for an organization. Capabilities map to systems and evidence, showing what security functions your infrastructure supports.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
    "List infrastructure systems in the organization's inventory. Systems are the tools and platforms that implement security capabilities.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/systems`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_system",
    "Add a system to the organization's infrastructure inventory. Systems can be linked to capabilities and evidence.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      name: z.string().describe("System name"),
      description: z.string().optional().describe("System description"),
      system_type: SystemType.describe("System type"),
      status: z.enum(["active", "inactive", "deprecated"]).default("active").describe("System status"),
      vendor: z.string().optional().describe("Vendor ID for this system — get from list_vendors"),
      category: z.string().optional().describe("System category (e.g., 'SIEM', 'Endpoint', 'Identity')"),
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
    "Update an existing system record. All fields are optional — only provided fields are updated.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      system_id: z.string().describe("System ID — get from list_systems"),
      name: z.string().optional().describe("System name"),
      description: z.string().optional().describe("System description"),
      system_type: SystemType.optional().describe("System type"),
      status: z.enum(["active", "inactive", "deprecated"]).optional().describe("System status"),
      vendor: z.string().optional().describe("Vendor ID for this system"),
      category: z.string().optional().describe("System category"),
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
    "Get the multi-axis KSI scorecard for all capability themes in one call. Returns per-theme Implementation Coverage, Maturity, Evidence Coverage, Evidence Quality, and composite KSI Posture Score (KPS) with Strong/Moderate/Developing bands. Replaces the dual-call pattern of list_capability_themes + evidence-posture. Source: scf-controls-platform #549 Phase 1.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
    "Get a single capability theme (KSI) with full posture, multi-axis scores, bands, and legacy posture_percentage. Use theme_code from list_capability_themes (e.g., 'ACCESS_CONTROL').",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      theme_code: z
        .string()
        .describe("Capability theme code (e.g., 'ACCESS_CONTROL') — get from list_capability_themes"),
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
    "List SCF controls mapped to a capability theme (KSI) with their scoping status, implementation status, and maturity level. Use to enumerate controls under a KSI for drill-down into evidence. Supports pagination and scope filtering.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      theme_code: z
        .string()
        .describe("Capability theme code (e.g., 'ACCESS_CONTROL') — get from list_capability_themes"),
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
        .describe("Max results per page (default: 50, max: 200)"),
      offset: z.number().int().min(0).optional().default(0).describe("Pagination offset (default: 0)"),
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

  server.tool(
    "scf_get_capability_theme_evidence_posture",
    "Get per-theme evidence assessment metrics — controls with evidence, file counts by assessment status (sufficient/partial/insufficient/pending/unassessed), average relevance score, and derived evidence confidence level (strong/moderate/weak/none). Use for KSI-centric evidence quality dashboards.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
