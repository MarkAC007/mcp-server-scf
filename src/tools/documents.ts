import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const ORG_ID = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");

const DOCUMENT_ID = z.string().uuid().describe("Generated document UUID — obtain from scf_list_documents");

const SECTION_ID = z
  .string()
  .describe(
    "Section identifier from the document detail (scf_get_document). May contain slashes — pass it exactly as returned, unescaped.",
  );

/**
 * ISMS document generation (platform doc-gen feature).
 *
 * Three-layer merge: a generator produces a section, a human may edit it, and
 * a later regeneration either matches, conflicts, or retires the section. The
 * tools below expose that lifecycle — generate, inspect, resolve, transition.
 */
export function registerDocumentTools(server: McpServer) {
  server.tool(
    "scf_list_document_generators",
    "List the ISMS document generators available to this organization (read — viewer role): generator name, document type, tier, derivative flag. Call before scf_generate_documents.",
    {
      org_id: ORG_ID,
    },
    { title: "List Document Generators", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/generators`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_document_domains",
    "List the SCF domains this organization can currently generate documents for (read — viewer role). A domain appears only when it has enough scoped controls to produce a document.",
    {
      org_id: ORG_ID,
    },
    { title: "List Document Domains", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/domains`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_document_settings",
    "Get the organization's document-generation settings (read — viewer role): whether doc-gen is enabled, whether derivative generators are enabled, and the SCF licence acknowledgement state.",
    {
      org_id: ORG_ID,
    },
    { title: "Get Document Settings", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/settings`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_document_settings",
    "Enable or configure document generation (write — admin role). Generation stays blocked until the SCF licence is acknowledged, so the first call usually sets both enabled and acknowledge_licence.",
    {
      org_id: ORG_ID,
      enabled: z.boolean().optional().describe("Turn document generation on or off for this organization"),
      derivative_generators_enabled: z
        .boolean()
        .optional()
        .describe("Allow generators that derive content from other generated documents"),
      acknowledge_licence: z
        .boolean()
        .optional()
        .describe("Record acknowledgement of the SCF content licence — required once before generation is permitted"),
    },
    { title: "Update Document Settings", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/documents/settings`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_generate_documents",
    "Queue ISMS document generation for one or more generators (write — admin role). Returns a task_id; poll scf_get_document_generation_status. Existing documents are skipped unless force is set.",
    {
      org_id: ORG_ID,
      requests: z
        .array(
          z.object({
            generator: z.string().describe("Generator name from scf_list_document_generators"),
            domain_id: z
              .string()
              .optional()
              .describe("SCF domain ID from scf_list_document_domains — required by domain-scoped generators"),
          }),
        )
        .min(1)
        .max(40)
        .describe("Between 1 and 40 generation requests to queue in this batch"),
      force: z
        .boolean()
        .optional()
        .describe("Regenerate even when a document already exists for that generator and domain (default false)"),
    },
    { title: "Generate Documents", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/documents/generate`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_document_generation_status",
    "Poll this organization's in-flight document generation (read — viewer role). Returns {status: 'idle'} when nothing is running. Call after scf_generate_documents until it completes.",
    {
      org_id: ORG_ID,
    },
    { title: "Get Document Generation Status", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/generation-status`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_documents",
    "List generated ISMS documents (read — viewer role): lifecycle status, section counts, unresolved conflicts, pending retirements, and whether the document is stale against current org inputs.",
    {
      org_id: ORG_ID,
      status: z.string().optional().describe("Filter by lifecycle status (e.g. 'draft', 'approved', 'published')"),
      document_type: z.string().optional().describe("Filter by document type (e.g. 'policy', 'procedure')"),
    },
    { title: "List Documents", readOnlyHint: true },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_document",
    "Get one generated document in full (read — viewer role): metadata plus every section with its merge state — clean, edited, conflicted or pending retirement. Use this to read a document.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
    },
    { title: "Get Document", readOnlyHint: true },
    async ({ org_id, document_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/${document_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_document_section",
    "Replace one section's content with a human edit (write — editor role). Tracked as a human layer, so a later regeneration reports a conflict instead of overwriting it silently.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
      section_id: SECTION_ID,
      content: z.string().describe("Full replacement markdown body for this section"),
    },
    { title: "Update Document Section", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, document_id, section_id, content }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/documents/${document_id}/sections/${section_id}`, {
          content,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_document_section_generated",
    "Get the generator's own version of a section, ignoring any human edit (read — viewer role). Use it to see what the platform would produce before resolving a conflict.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
      section_id: SECTION_ID,
      version: z.number().int().optional().describe("Generation version number to read; omit for the latest"),
    },
    { title: "Get Generated Document Section", readOnlyHint: true },
    async ({ org_id, document_id, section_id, version }) => {
      try {
        const client = getClient();
        const data = await client.get(
          `/organizations/${org_id}/documents/${document_id}/sections/${section_id}/generated`,
          { version },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_resolve_document_section",
    "Resolve one section's merge state (write — editor role). keep_mine/take_generated settle a conflict; retire/keep dispose of a pending retirement. The wrong pair for the state returns 409.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
      section_id: SECTION_ID,
      choice: z
        .enum(["keep_mine", "take_generated", "retire", "keep"])
        .describe("keep_mine / take_generated answer a conflict; retire / keep answer a pending retirement"),
    },
    { title: "Resolve Document Section", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, document_id, section_id, choice }) => {
      try {
        const client = getClient();
        const data = await client.post(
          `/organizations/${org_id}/documents/${document_id}/sections/${section_id}/resolve`,
          { choice },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_transition_document",
    "Move a document through its lifecycle — draft to review, review to approved, approved to published (write — approving and publishing need admin). Valid targets are enforced by the platform.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
      to_status: z.string().describe("Target lifecycle status (e.g. 'in_review', 'approved', 'published')"),
      reason: z.string().optional().describe("Free-text justification recorded on the transition"),
    },
    { title: "Transition Document", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, document_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/documents/${document_id}/transition`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_document_history",
    "Get a document's version and transition history (read — viewer role): who moved it between lifecycle states, when, why, and what each generation version changed.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
    },
    { title: "Get Document History", readOnlyHint: true },
    async ({ org_id, document_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/${document_id}/history`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_export_document",
    "Export a document as rendered markdown or HTML text (read — viewer role). The platform also renders PDF, but that is a binary download and is not offered here — fetch it from the web UI instead.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
      format: z
        .enum(["md", "html"])
        .default("md")
        .describe("Export format: 'md' for markdown, 'html' for rendered HTML"),
    },
    { title: "Export Document", readOnlyHint: true },
    async ({ org_id, document_id, format }) => {
      try {
        const client = getClient();
        const data = await client.getText(`/organizations/${org_id}/documents/${document_id}/export`, {
          format,
        });
        return { content: [{ type: "text", text: data.body }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_preview_document",
    "Preview a document's assembled content as structured JSON (read — viewer role) — the merged result of generated and edited sections without rendering to a file.",
    {
      org_id: ORG_ID,
      document_id: DOCUMENT_ID,
    },
    { title: "Preview Document", readOnlyHint: true },
    async ({ org_id, document_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/documents/${document_id}/preview`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
