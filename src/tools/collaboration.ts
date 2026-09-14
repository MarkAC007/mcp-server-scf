import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const AssignableType = z.enum(["control", "evidence", "task"]);
const CommentableType = z.enum(["control", "evidence", "task"]);

export function registerCollaborationTools(server: McpServer) {
  server.tool(
    "scf_list_assignments",
    "List user assignments to controls, evidence items or tasks (read — viewer role). Filter by item type and id, or by user_id to see one person's workload.",
    {
      assignable_type: AssignableType.optional().describe("Filter by item kind"),
      assignable_id: z.string().uuid().optional().describe("Item UUID"),
      user_id: z.string().uuid().optional().describe("Assignee — obtain from scf_list_members"),
    },
    { title: "List Assignments", readOnlyHint: true },
    async ({ assignable_type, assignable_id, user_id }) => {
      try {
        const client = getClient();
        const data = await client.get("/assignments", { assignable_type, assignable_id, user_id });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_assignment",
    "Assign a user to a control, evidence item or task as primary or collaborator (write — editor role). Use scf_batch_update_evidence for evidence owners in bulk.",
    {
      assignable_type: AssignableType.describe("Item kind"),
      assignable_id: z.string().uuid().describe("Scoped control, evidence tracking or task UUID"),
      user_id: z.string().uuid().describe("Assignee — obtain from scf_list_members"),
      role: z.enum(["primary", "collaborator"]).default("primary").describe("Assignment role (default primary)"),
    },
    { title: "Create Assignment", readOnlyHint: false, destructiveHint: false },
    async (body) => {
      try {
        const client = getClient();
        const data = await client.post("/assignments", body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_assignment",
    "Remove a user assignment (destructive write — editor role).",
    {
      assignment_id: z.string().uuid().describe("Assignment UUID — from scf_list_assignments"),
    },
    { title: "Delete Assignment", readOnlyHint: false, destructiveHint: true },
    async ({ assignment_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/assignments/${assignment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_comments",
    "List the comment thread on one control, evidence item or task (read — viewer role), oldest first, with authors, mentions and reply structure.",
    {
      commentable_type: CommentableType.describe("Item kind"),
      commentable_id: z.string().uuid().describe("Scoped control, evidence tracking or task UUID"),
    },
    { title: "List Comments", readOnlyHint: true },
    async ({ commentable_type, commentable_id }) => {
      try {
        const client = getClient();
        const data = await client.get("/comments", { commentable_type, commentable_id });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_comment",
    "Post a comment on a control, evidence item or task (write — any member). Mention users by UUID to notify them; set parent_comment_id to reply in a thread.",
    {
      commentable_type: CommentableType.describe("Item kind"),
      commentable_id: z.string().uuid().describe("Scoped control, evidence tracking or task UUID"),
      content: z.string().min(1).describe("Comment body"),
      mentions: z.array(z.string().uuid()).optional().describe("User UUIDs to notify"),
      parent_comment_id: z.string().uuid().optional().describe("Reply to this comment"),
    },
    { title: "Create Comment", readOnlyHint: false, destructiveHint: false },
    async (body) => {
      try {
        const client = getClient();
        const data = await client.post("/comments", body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_comment",
    "Edit a comment you authored (write — author only). Replaces the body and, if given, the mentions; the platform keeps the edit history.",
    {
      comment_id: z.string().uuid().describe("Comment UUID — obtain from scf_list_comments"),
      content: z.string().min(1).describe("New comment body"),
      mentions: z.array(z.string().uuid()).optional().describe("User UUIDs to notify"),
    },
    { title: "Update Comment", readOnlyHint: false, destructiveHint: false },
    async ({ comment_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/comments/${comment_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_comment",
    "Retract a comment you authored (write — author only). Soft delete: the thread keeps its place, the body is withdrawn.",
    {
      comment_id: z.string().uuid().describe("Comment UUID — obtain from scf_list_comments"),
    },
    { title: "Delete Comment", readOnlyHint: false, destructiveHint: true },
    async ({ comment_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/comments/${comment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
