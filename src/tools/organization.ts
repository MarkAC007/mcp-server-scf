import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerOrganizationTools(server: McpServer) {
  server.tool(
    "scf_get_current_user",
    "Get the authenticated caller's profile: name, email, organization memberships, and per-org role.",
    {},
    { title: "Get Current User", readOnlyHint: true },
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
    { title: "List Organizations", readOnlyHint: true },
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
    { title: "Get Organization", readOnlyHint: true },
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
    { title: "List Members", readOnlyHint: true },
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
    { title: "Get Work Queue", readOnlyHint: true },
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
    "scf_get_org_work_queue",
    "Get one organization's consolidated GRC work queue (read — viewer role): overdue evidence tasks, blocking controls, stale collection schedules. assigned_to_me narrows to the caller.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      assigned_to_me: z
        .boolean()
        .default(false)
        .describe("Only items owned by or assigned to the caller (default false)"),
    },
    { title: "Get Organization Work Queue", readOnlyHint: true },
    async ({ org_id, assigned_to_me }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/dashboard/work-queue`, { assigned_to_me });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_audit_log",
    "Query one organization's append-only audit trail (read — viewer role): field-level changes with actor, source and before/after values. Filter by entity, control, action, actor, source, date or text.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      entity_type: z
        .string()
        .optional()
        .describe(
          "Filter by exact entity type as written in the log, e.g. scoped_control, evidence_file, audit_engagement, vendor — unsure of the spelling? use search_text",
        ),
      entity_id: z.string().uuid().optional().describe("Filter by the changed entity's UUID"),
      scf_id: z.string().optional().describe("Filter by SCF control ID in DOMAIN-NN format"),
      action: z.enum(["create", "update", "delete"]).optional().describe("Filter by action: create, update or delete"),
      changed_by_user_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter by the user who made the change — obtain from scf_list_members"),
      action_source: z
        .enum(["ui", "api_key", "mcp", "system"])
        .optional()
        .describe("Filter by origin of the change: ui, api_key, mcp or system"),
      request_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter by request correlation ID — groups every change one API call made"),
      date_from: z
        .string()
        .optional()
        .describe("Include changes at or after this ISO-8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)"),
      date_to: z
        .string()
        .optional()
        .describe("Include changes at or before this ISO-8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)"),
      actor_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter by actor user UUID — platform alias of changed_by_user_id"),
      search_text: z
        .string()
        .optional()
        .describe("Case-insensitive search across entity_type, field_name, old_value and new_value"),
      limit: z.number().int().min(1).max(200).default(50).describe("Page size (1–200, default 50)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset — number of results to skip (default 0)"),
    },
    { title: "Get Audit Log", readOnlyHint: true },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/audit-log`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_change_cursor",
    "Cheap has-anything-changed probe (read — viewer role): newest audit timestamp and row count for one organization. Compare with the pair you last saw; poll this before re-pulling the audit log.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Change Cursor", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/changes/cursor`);
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
    { title: "Get Notifications", readOnlyHint: true },
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

  server.tool(
    "scf_mark_notifications_read",
    "Mark notifications read for the current user (write — self only): one by notification_id, or every notification when all=true. Acknowledge after processing scf_get_notifications.",
    {
      notification_id: z.string().uuid().optional().describe("Notification UUID to mark read"),
      all: z
        .boolean()
        .default(false)
        .describe("Mark every notification read — explicit opt-in, ignored when notification_id is given"),
    },
    { title: "Mark Notifications Read", readOnlyHint: false, destructiveHint: false },
    async ({ notification_id, all }) => {
      try {
        if (!notification_id && !all) {
          return errorResult(
            new Error(
              "Pass notification_id to mark one notification read, or all=true to mark every notification read",
            ),
          );
        }
        const client = getClient();
        const path = notification_id ? `/notifications/${notification_id}/read` : "/notifications/read-all";
        const data = await client.patch(path);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
