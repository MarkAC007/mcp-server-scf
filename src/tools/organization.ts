import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerOrganizationTools(server: McpServer) {
  server.tool(
    "scf_get_current_user",
    "Get the authenticated caller's profile: name, email, organization memberships, and per-org role.",
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
    "scf_list_organizations",
    "List every organization the caller has access to. Returns org UUID, name, subscription tier, and member count. Use this first to obtain the org_id other tools need.",
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
    "scf_get_organization",
    "Get one organization's detail: subscription tier, member count, usage limits, and settings.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
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
    "scf_list_members",
    "List members of one organization with their role (admin, editor, or viewer).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
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
    "scf_get_work_queue",
    "Get the caller's work queue: prioritized pending tasks, assignments, and action items across every organization they belong to.",
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
    "scf_get_audit_log",
    "Get one organization's audit trail: field-level changes to controls, evidence, and related entities, with actor, timestamp, and before/after values.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      limit: z.number().int().min(1).max(100).default(50).describe("Page size (1–100, default 50)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset — number of results to skip (default 0)"),
    },
    async ({ org_id, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/audit-log`, { limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_notifications",
    "Get the caller's notifications: new assignments, comments, status changes, and system alerts.",
    {
      unread_only: z.boolean().default(false).describe("Return only unread notifications (default false)"),
      limit: z.number().int().min(1).max(100).default(25).describe("Page size (1–100, default 25)"),
    },
    async ({ unread_only, limit }) => {
      try {
        const client = getClient();
        const data = await client.get("/notifications", { unread_only, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
