import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerOrganizationTools(server: McpServer) {
  server.tool(
    "get_current_user",
    "Get the current authenticated user's profile, including name, email, organizations, and role.",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/users/me");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_organizations",
    "List organizations the current user has access to. Returns org ID, name, tier, and member count.",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/organizations");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_organization",
    "Get detailed organization information including subscription tier, member count, usage limits, and settings.",
    {
      org_id: z.string().describe("Organization ID"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_members",
    "List members of an organization with their roles (admin, editor, viewer).",
    {
      org_id: z.string().describe("Organization ID"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/members`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_work_queue",
    "Get the authenticated user's work queue — a prioritized list of pending tasks, assignments, and action items across all their organizations.",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/users/me/dashboard");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_audit_log",
    "Get the audit trail for an organization. Shows field-level changes to controls, evidence, and other entities with actor, timestamp, and before/after values.",
    {
      org_id: z.string().describe("Organization ID"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(50).describe("Results per page"),
    },
    async ({ org_id, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get(`/audit-logs/${org_id}`, { page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_notifications",
    "Get notifications for the current user — new assignments, comments, status changes, and system alerts.",
    {
      unread_only: z.boolean().default(false).describe("Only return unread notifications"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ unread_only, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get("/notifications", { unread_only, page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
