import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerCapabilityTools(server: McpServer) {
  server.tool(
    "list_capability_themes",
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
    "list_capabilities",
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
    "list_systems",
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
    "create_system",
    "Add a system to the organization's infrastructure inventory. Systems can be linked to capabilities and evidence.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      name: z.string().describe("System name"),
      description: z.string().optional().describe("System description"),
      system_type: z
        .enum([
          "cloud_provider",
          "identity_provider",
          "ticketing",
          "logging",
          "security_tool",
          "code_repository",
          "document_management",
          "custom",
        ])
        .describe("System type"),
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
    "update_system",
    "Update an existing system record. All fields are optional — only provided fields are updated.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      system_id: z.string().describe("System ID — get from list_systems"),
      name: z.string().optional().describe("System name"),
      description: z.string().optional().describe("System description"),
      system_type: z
        .enum([
          "cloud_provider",
          "identity_provider",
          "ticketing",
          "logging",
          "security_tool",
          "code_repository",
          "document_management",
          "custom",
        ])
        .optional()
        .describe("System type"),
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
}
