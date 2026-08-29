import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const ORG_ID = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");

/**
 * Compliance Document Mapping (CDM).
 *
 * The platform ingests an organization's own policy corpus and proposes which
 * of its documents evidence which controls. These tools cover the review queue
 * and the coverage map. Document upload, reingestion and chunk backfill are
 * deliberately not exposed: they are multipart or long-running maintenance
 * operations that belong in the web UI.
 */
export function registerCdmTools(server: McpServer) {
  server.tool(
    "scf_get_cdm_document_map",
    "Get the CDM document map (read — viewer role): per-domain coverage showing which ingested documents speak to which SCF domains, and where the corpus is silent. Finds documentation gaps.",
    {
      org_id: ORG_ID,
    },
    { title: "Get CDM Document Map", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/cdm/document-map`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_cdm_documents",
    "List the documents ingested into the organization's CDM corpus (read — viewer role), with their ingestion state.",
    {
      org_id: ORG_ID,
      limit: z.number().int().min(1).max(200).optional().describe("Page size, 1–200 (default 50)"),
      offset: z.number().int().min(0).optional().describe("Rows to skip for pagination (default 0)"),
    },
    { title: "List CDM Documents", readOnlyHint: true },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/cdm/documents`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_cdm_proposals",
    "List control-level CDM proposals with nested citations (read — viewer role), highest consolidated score first. The review queue: 'this document evidences this control, here is where'.",
    {
      org_id: ORG_ID,
      control_id: z.string().uuid().optional().describe("Filter to one scoped control by its UUID"),
      document_id: z.string().uuid().optional().describe("Filter to proposals from one CDM document"),
      status: z.string().optional().describe("Filter by proposal status (e.g. 'proposed', 'accepted', 'dismissed')"),
      limit: z.number().int().min(1).max(200).optional().describe("Page size, 1–200 (default 50)"),
      offset: z.number().int().min(0).optional().describe("Rows to skip for pagination (default 0)"),
    },
    { title: "List CDM Proposals", readOnlyHint: true },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/cdm/proposals`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_accept_cdm_proposal",
    "Accept a control-level CDM proposal (write — editor role). One decision covers the whole card: the proposal and every citation under it flip to accepted together.",
    {
      org_id: ORG_ID,
      proposal_id: z.string().uuid().describe("Proposal UUID — obtain from scf_list_cdm_proposals"),
    },
    { title: "Accept CDM Proposal", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, proposal_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/cdm/proposals/${proposal_id}/accept`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_dismiss_cdm_proposal",
    "Dismiss a control-level CDM proposal (write — editor role). The proposal and its citations are dismissed together, and the reason — if given — is stored on each.",
    {
      org_id: ORG_ID,
      proposal_id: z.string().uuid().describe("Proposal UUID — obtain from scf_list_cdm_proposals"),
      reason: z
        .string()
        .optional()
        .describe("Why this proposal was rejected — recorded on the proposal and its citations"),
    },
    { title: "Dismiss CDM Proposal", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, proposal_id, reason }) => {
      try {
        const client = getClient();
        const data = await client.post(
          `/organizations/${org_id}/cdm/proposals/${proposal_id}/dismiss`,
          reason === undefined ? {} : { reason },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_cdm_mappings",
    "List CDM citation-level mappings (read — viewer role): the document passages proposed as evidence for a control, each lifecycle-badged. Use scf_list_cdm_proposals for the per-control view.",
    {
      org_id: ORG_ID,
      control_id: z.string().uuid().optional().describe("Filter to one scoped control by its UUID"),
      status: z.string().optional().describe("Filter by mapping status (e.g. 'proposed', 'accepted', 'dismissed')"),
      limit: z.number().int().min(1).max(200).optional().describe("Page size, 1–200 (default 50)"),
      offset: z.number().int().min(0).optional().describe("Rows to skip for pagination (default 0)"),
    },
    { title: "List CDM Mappings", readOnlyHint: true },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/cdm/mappings`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_query_cdm_corpus",
    "Search the organization's ingested policy corpus for passages relevant to one scoped control (read — viewer role). Ranked hits with source documents: 'what do our own documents say?'",
    {
      org_id: ORG_ID,
      control_id: z
        .string()
        .uuid()
        .describe("Scoped control UUID to search against — obtain from scf_list_scoped_controls"),
      query_text: z
        .string()
        .optional()
        .describe("Extra search text to bias the results; omit to use the control's own wording"),
      limit: z.number().int().min(1).max(200).optional().describe("Maximum hits to return, 1–200 (default 10)"),
    },
    { title: "Query CDM Corpus", readOnlyHint: true },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/cdm/query`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
