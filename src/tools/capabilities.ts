import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerCapabilityTools(server: McpServer) {
  server.tool(
    "list_capability_themes",
    "List the 11 KSI-aligned capability themes that group NIST 800-53 controls into security capability areas. Provides a high-level view of your security posture by capability.",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/capability-themes");
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
      org_id: z.string().describe("Organization ID"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ org_id, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capabilities`, { page, per_page });
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
      org_id: z.string().describe("Organization ID"),
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
      org_id: z.string().describe("Organization ID"),
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
}
