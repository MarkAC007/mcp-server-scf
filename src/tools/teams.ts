import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const AssignmentItemType = z.enum(["control", "evidence"]);

export function registerTeamTools(server: McpServer) {
  server.tool(
    "scf_list_functions",
    "List the platform's business functions (read — any member): the fixed set every team aligns to, identical for every tenant. Needed for the function_id on scf_create_team.",
    {
      include_inactive: z.boolean().default(false).describe("Include retired functions (default false)"),
    },
    { title: "List Functions", readOnlyHint: true },
    async ({ include_inactive }) => {
      try {
        const client = getClient();
        const data = await client.get("/functions", { include_inactive });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_teams",
    "List the organization's teams (read — viewer role). Archived teams are hidden unless include_inactive is set; they are kept, never deleted, so history still resolves.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      function_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter by business function — obtain from scf_list_functions"),
      include_inactive: z.boolean().default(false).describe("Include archived teams (default false)"),
    },
    { title: "List Teams", readOnlyHint: true },
    async ({ org_id, function_id, include_inactive }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/teams`, { function_id, include_inactive });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_team",
    "Get one team with its full roster and advisory health warnings (read — viewer role), e.g. no primary owner or no members.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      team_id: z.string().uuid().describe("Team UUID — obtain from scf_list_teams"),
    },
    { title: "Get Team", readOnlyHint: true },
    async ({ org_id, team_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/teams/${team_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_team",
    "Create a team aligned to a business function (write — admin role). The team is born empty; that is legal and reported through health warnings, not refused.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      name: z.string().min(1).max(255).describe("Team name (1–255 characters)"),
      description: z.string().optional().describe("What the team is responsible for"),
      function_id: z.string().uuid().describe("Primary business function — obtain from scf_list_functions"),
      function_ids: z.array(z.string().uuid()).optional().describe("Additional functions the team serves"),
    },
    { title: "Create Team", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/teams`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_team",
    "Update a team's name, description, function alignment or active flag (write — admin role). Set is_active=false to archive; the row is never deleted.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      team_id: z.string().uuid().describe("Team UUID — obtain from scf_list_teams"),
      name: z.string().optional().describe("New team name"),
      description: z.string().optional().describe("New description"),
      function_id: z
        .string()
        .uuid()
        .optional()
        .describe("New primary business function — obtain from scf_list_functions"),
      function_ids: z
        .array(z.string().uuid())
        .optional()
        .describe("Replacement set of additional functions the team serves"),
      is_active: z.boolean().optional().describe("false archives the team"),
    },
    { title: "Update Team", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, team_id, ...fields }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/teams/${team_id}`, fields);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_add_team_member",
    "Add an organization member to a team as primary, delegate or member (write — admin role). Adding a primary or delegate when the seat is taken demotes the incumbent to member.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      team_id: z.string().uuid().describe("Team UUID — obtain from scf_list_teams"),
      user_id: z.string().uuid().describe("User UUID — obtain from scf_list_members"),
      membership_role: z.enum(["primary", "delegate", "member"]).describe("Seat on the team"),
    },
    { title: "Add Team Member", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, team_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/teams/${team_id}/members`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_remove_team_member",
    "Remove a user from a team (destructive write — admin role). The membership row is deleted; the audit trail keeps the history.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      team_id: z.string().uuid().describe("Team UUID — obtain from scf_list_teams"),
      user_id: z.string().uuid().describe("User UUID — obtain from scf_get_team"),
    },
    { title: "Remove Team Member", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, team_id, user_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/teams/${team_id}/members/${user_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_team_assignments",
    "Map of which team owns which scoped control or evidence item (read — viewer role). Unfiltered returns the whole map; narrow with item_ids, team_id or accountable_only.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      type: AssignmentItemType.describe("Item kind"),
      item_ids: z.array(z.string().uuid()).optional().describe("Restrict to these item UUIDs"),
      team_id: z.string().uuid().optional().describe("Restrict to one team"),
      accountable_only: z.boolean().default(false).describe("Only the accountable team per item"),
    },
    { title: "List Team Assignments", readOnlyHint: true },
    async ({ org_id, type, item_ids, team_id, accountable_only }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/team-assignments`, {
          type,
          item_ids,
          team_id,
          accountable_only,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_team_assignment",
    "Assign a team to one scoped control or evidence item (write — admin role). is_accountable makes it the accountable team and demotes any incumbent to consulted.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      type: AssignmentItemType.describe("Item kind"),
      item_id: z.string().uuid().describe("Scoped control or evidence tracking record UUID"),
      team_id: z.string().uuid().describe("Team UUID — obtain from scf_list_teams"),
      is_accountable: z.boolean().default(false).describe("Make this the accountable team (default false)"),
    },
    { title: "Create Team Assignment", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/team-assignments`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_batch_create_team_assignments",
    "Assign one team to up to 500 controls or evidence items in one transaction with one aggregate notification (write — admin role). The bulk accountability tool.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      type: AssignmentItemType.describe("Item kind"),
      team_id: z.string().uuid().describe("Team UUID — obtain from scf_list_teams"),
      item_ids: z.array(z.string().uuid()).min(1).max(500).describe("Item UUIDs to assign, max 500"),
      is_accountable: z.boolean().default(false).describe("Make this the accountable team (default false)"),
    },
    { title: "Batch Create Team Assignments", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/team-assignments/batch`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_team_assignment",
    "Remove a team's assignment from a control or evidence item (destructive write — admin role).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      assignment_id: z.string().uuid().describe("Team assignment UUID — from scf_list_team_assignments"),
    },
    { title: "Delete Team Assignment", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, assignment_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/team-assignments/${assignment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
