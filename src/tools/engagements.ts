import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const ORG_ID = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");

const ENGAGEMENT_ID = z.string().uuid().describe("Audit engagement UUID — obtain from scf_list_engagements");

/**
 * Audit Engagement Workspaces.
 *
 * An engagement freezes a scope of controls against the catalog version it was
 * assessed under, grants named auditors read access to that scope alone, and
 * carries structured auditor queries with responses.
 */
export function registerEngagementTools(server: McpServer) {
  server.tool(
    "scf_list_engagements",
    "List the organization's audit engagements (read — viewer role). Each entry carries its frameworks, status, dates and the catalog version its scope was frozen against.",
    {
      org_id: ORG_ID,
      status: z.string().optional().describe("Filter by engagement status (e.g. 'planning', 'fieldwork', 'closed')"),
    },
    { title: "List Engagements", readOnlyHint: true },
    async ({ org_id, status }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements`, { status });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_engagement",
    "Get one audit engagement's detail (read — viewer role, or an auditor assigned to this engagement).",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
    },
    { title: "Get Engagement", readOnlyHint: true },
    async ({ org_id, engagement_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements/${engagement_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_engagement",
    "Create an audit engagement (write — admin role). This freezes the in-scope controls for the named frameworks against the current catalog version, so the scope renders even after deprecations.",
    {
      org_id: ORG_ID,
      name: z.string().describe("Engagement name, e.g. a framework and audit period"),
      frameworks: z
        .array(z.string())
        .min(1)
        .describe("Framework identifiers in scope — obtain from scf_list_frameworks"),
      start_date: z.string().optional().describe("Fieldwork start date, ISO 8601 (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("Fieldwork end date, ISO 8601 (YYYY-MM-DD)"),
    },
    { title: "Create Engagement", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/engagements`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_engagement",
    "Update an audit engagement's name, frameworks, status or dates (write — admin role). Only the fields you pass are changed.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      name: z.string().optional().describe("New engagement name"),
      frameworks: z.array(z.string()).optional().describe("Replacement framework identifier list"),
      status: z.string().optional().describe("New engagement status (e.g. 'fieldwork', 'closed')"),
      start_date: z.string().optional().describe("Fieldwork start date, ISO 8601 (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("Fieldwork end date, ISO 8601 (YYYY-MM-DD)"),
    },
    { title: "Update Engagement", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/engagements/${engagement_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_engagement",
    "Delete an audit engagement and its frozen scope (destructive write — admin role). Returns no content on success. Auditor access granted through this engagement is revoked with it.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
    },
    { title: "Delete Engagement", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, engagement_id }) => {
      try {
        const client = getClient();
        await client.delete(`/organizations/${org_id}/engagements/${engagement_id}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ deleted: true, engagement_id }, null, 2),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_engagement_scope",
    "Get an engagement's frozen control scope (read — viewer role, or an assigned auditor). Rows carry a catalog lifecycle badge, so controls deprecated since the freeze still render, marked.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
    },
    { title: "Get Engagement Scope", readOnlyHint: true },
    async ({ org_id, engagement_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements/${engagement_id}/scope`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_engagement_presentation",
    "Get the engagement's scope presented natively in one of its frameworks (read — viewer, or assigned auditor): SCF controls organised by that framework's own structure, as an auditor reads them.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      framework: z.string().describe("Framework to present from — must be one of the engagement's own frameworks"),
    },
    { title: "Get Engagement Presentation", readOnlyHint: true },
    async ({ org_id, engagement_id, framework }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements/${engagement_id}/presentation`, {
          framework,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_my_engagements",
    "List the engagements the calling identity can read as an assigned auditor, across organizations (read). This is the auditor's own view — use scf_list_engagements for the organization-side list.",
    {},
    { title: "List My Engagements", readOnlyHint: true },
    async () => {
      try {
        const client = getClient();
        const data = await client.get(`/my-engagements`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_engagement_auditors",
    "List the auditors granted read access to one engagement (read — viewer role).",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
    },
    { title: "List Engagement Auditors", readOnlyHint: true },
    async ({ org_id, engagement_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements/${engagement_id}/auditors`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_add_engagement_auditor",
    "Grant an existing user read access to one engagement (write — admin role). The grant is engagement-scoped: it exposes that engagement's frozen scope and queries, nothing else in the organization.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      user_id: z
        .string()
        .uuid()
        .describe("UUID of an existing user to grant engagement access to — obtain from scf_list_members"),
    },
    { title: "Add Engagement Auditor", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, user_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/engagements/${engagement_id}/auditors`, { user_id });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_remove_engagement_auditor",
    "Revoke an auditor's access to one engagement (destructive write — admin role). Returns no content on success.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      auditor_id: z
        .string()
        .uuid()
        .describe("Engagement auditor record UUID — obtain from scf_list_engagement_auditors"),
    },
    { title: "Remove Engagement Auditor", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, engagement_id, auditor_id }) => {
      try {
        const client = getClient();
        await client.delete(`/organizations/${org_id}/engagements/${engagement_id}/auditors/${auditor_id}`);
        return {
          content: [{ type: "text", text: JSON.stringify({ removed: true, auditor_id }, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_engagement_queries",
    "List an engagement's structured auditor queries (read — viewer role, or an assigned auditor). A query is an auditor's question against one control, with its responses and status.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      scf_id: z
        .string()
        .optional()
        .describe("Filter to a single SCF control in DOMAIN-NN format — obtain from scf_get_engagement_scope"),
      status: z.string().optional().describe("Filter by query status: open, answered or closed"),
    },
    { title: "List Engagement Queries", readOnlyHint: true },
    async ({ org_id, engagement_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements/${engagement_id}/queries`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_engagement_query",
    "Get one auditor query with its full response thread (read — viewer role, or an assigned auditor).",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      query_id: z.string().uuid().describe("Query UUID — obtain from scf_list_engagement_queries"),
    },
    { title: "Get Engagement Query", readOnlyHint: true },
    async ({ org_id, engagement_id, query_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/engagements/${engagement_id}/queries/${query_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_engagement_query",
    "Raise an auditor query against one control in the engagement's scope (write — editor role, or an assigned auditor). The control must be in the engagement's frozen scope.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      scf_id: z
        .string()
        .describe(
          "SCF control the query is about, in DOMAIN-NN format — must be in scope, see scf_get_engagement_scope",
        ),
      title: z.string().describe("Short summary of what is being asked"),
      body: z.string().describe("Full text of the query"),
    },
    { title: "Create Engagement Query", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/engagements/${engagement_id}/queries`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_respond_to_engagement_query",
    "Add a response to an auditor query (write — editor role, or an assigned auditor). Returns the updated query with its full thread.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      query_id: z.string().uuid().describe("Query UUID — obtain from scf_list_engagement_queries"),
      content: z.string().describe("Response text"),
    },
    { title: "Respond to Engagement Query", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, query_id, content }) => {
      try {
        const client = getClient();
        const data = await client.post(
          `/organizations/${org_id}/engagements/${engagement_id}/queries/${query_id}/responses`,
          { content },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_engagement_query_status",
    "Move an auditor query through its lifecycle (write — editor role, or an assigned auditor). The platform validates the transition, so an invalid target is refused rather than recorded.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      query_id: z.string().uuid().describe("Query UUID — obtain from scf_list_engagement_queries"),
      status: z.enum(["open", "answered", "closed"]).describe("Target query status"),
    },
    { title: "Update Engagement Query Status", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, query_id, status }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/engagements/${engagement_id}/queries/${query_id}`, {
          status,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
