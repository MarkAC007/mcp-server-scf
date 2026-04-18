import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerEvidenceTools(server: McpServer) {
  server.tool(
    "scf_list_evidence",
    "List evidence items tracked against an organization's controls. Returns each item's tracking status, maturity level, and linked controls. Optionally filter by system.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      system_id: z.string().uuid().optional().describe("System UUID to filter by — obtain from scf_list_systems"),
    },
    async ({ org_id, system_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-tracking`, {
          system_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_evidence",
    "Create an evidence tracking record from a catalog evidence ID (write — editor+ role). Starts tracking an evidence item for the organization.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z
        .string()
        .describe("Catalog evidence ID (e.g., 'E-IAM-01') — obtain from scf_list_evidence_catalog"),
      is_tracked: z.boolean().default(false).describe("Start actively tracking this item (default false)"),
      system_id: z
        .string()
        .uuid()
        .optional()
        .describe("System UUID to link this evidence to — obtain from scf_list_systems"),
      method_of_collection: z.string().optional().describe("Collection approach: 'automated', 'manual', or 'hybrid'"),
      collecting_system: z.string().optional().describe("Name of the tool or system that collects the evidence"),
      owner: z.string().optional().describe("Person accountable for this evidence item"),
      frequency: z
        .string()
        .optional()
        .describe("Collection cadence: 'daily', 'weekly', 'monthly', 'quarterly', or 'annually'"),
      comments: z.string().optional().describe("Free-text notes or context"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence-tracking`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_maturity",
    "Get the organization's evidence maturity summary: average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-maturity-summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_evidence_files",
    "List all files uploaded or ingested for an evidence item. Returns filename, content type, upload timestamp, validation status, and a pre-signed download URL (15-min expiry).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — obtain from scf_list_evidence"),
    },
    async ({ org_id, evidence_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/files`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_file",
    "Get metadata and a pre-signed download URL (15-min expiry) for a single evidence file. Use to inspect or retrieve a specific uploaded artifact.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — obtain from scf_list_evidence"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
    },
    async ({ org_id, evidence_id, file_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_evidence",
    "Upsert an evidence item's tracking fields (write — editor+ role). Creates the tracking row if missing. All body fields are optional; only provided fields are applied.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z
        .string()
        .describe(
          "Catalog evidence ID (e.g., 'E-IAM-01') — obtain from scf_list_evidence or scf_list_evidence_catalog",
        ),
      is_tracked: z.boolean().optional().describe("Toggle active tracking for this item"),
      system_id: z
        .string()
        .uuid()
        .optional()
        .describe("System UUID to link this evidence to — obtain from scf_list_systems"),
      method_of_collection: z.string().optional().describe("Collection approach: 'automated', 'manual', or 'hybrid'"),
      collecting_system: z.string().optional().describe("Name of the tool or system that collects the evidence"),
      owner: z.string().optional().describe("Person accountable for this evidence item"),
      frequency: z
        .string()
        .optional()
        .describe("Collection cadence: 'daily', 'weekly', 'monthly', 'quarterly', or 'annually'"),
      comments: z.string().optional().describe("Free-text notes or context"),
    },
    async ({ org_id, evidence_id, ...fields }) => {
      try {
        const client = getClient();
        // POST (upsert) instead of PATCH — creates the tracking record if it
        // doesn't exist yet, updates if it does.  PATCH returns 404 for evidence
        // items that haven't been activated via the UI.
        const data = await client.post(`/organizations/${org_id}/evidence-tracking`, {
          evidence_id,
          ...fields,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Evidence Validation (Issue #218)
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_get_evidence_validation",
    "Get the validation result for a single evidence file: status (valid/warning/partial/invalid), completeness score, individual rule findings, source, and timestamp.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — obtain from scf_list_evidence"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
    },
    async ({ org_id, evidence_id, file_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/validation`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_revalidate_evidence_file",
    "Re-run the validation engine against an evidence file (write — editor+ role). Checks catalog existence, content type, field coverage, freshness, storage. Returns the updated result.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — obtain from scf_list_evidence"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
    },
    async ({ org_id, evidence_id, file_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/validate`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_validation_summary",
    "Get aggregate evidence validation metrics for the organization dashboard: total files validated, counts by status (valid/warning/partial/invalid), and overall pass rate.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/validation/summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // AI Evidence Assessment
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_trigger_evidence_assessment",
    "Queue an AI assessment of a single evidence file (write — editor+ role, async). Returns a pending record; poll scf_get_evidence_assessment until status is sufficient/partial/insufficient.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — obtain from scf_list_evidence"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
      assessment_source: z
        .enum(["on_demand", "auto", "bulk"])
        .optional()
        .default("on_demand")
        .describe("Origin tag for the request (default on_demand)"),
    },
    async ({ org_id, evidence_id, file_id, assessment_source }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/assess`, {
          assessment_source,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_assessment",
    "Get the AI assessment for an evidence file: status, relevance score (0–100), structured findings, summary, and audit metadata (model, tokens, cost). Poll after scf_trigger_evidence_assessment.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — obtain from scf_list_evidence"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
    },
    async ({ org_id, evidence_id, file_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/assessment`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_bulk_assess_evidence",
    "Queue AI assessments for multiple evidence files (write — editor+ role, async, max 50). Provide evidence_id, file_ids, and/or assess_unassessed. Returns count queued.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().optional().describe("Evidence ID — assesses every file under this evidence item"),
      file_ids: z.array(z.string().uuid()).optional().describe("Specific evidence file UUIDs to assess"),
      assess_unassessed: z
        .boolean()
        .optional()
        .default(false)
        .describe("Also assess every file that has no existing assessment (default false)"),
    },
    async ({ org_id, evidence_id, file_ids, assess_unassessed }) => {
      try {
        const client = getClient();
        const body: Record<string, unknown> = {};
        if (evidence_id) body.evidence_id = evidence_id;
        if (file_ids) body.file_ids = file_ids;
        if (assess_unassessed) body.assess_unassessed = assess_unassessed;
        const data = await client.post(`/organizations/${org_id}/evidence/assess-bulk`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_assessment_summary",
    "Get aggregate AI assessment metrics for the organization dashboard: total assessed, counts by status, unassessed count, average relevance score, and total cost in cents.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/assessment/summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_evidence_tasks",
    "List evidence collection tasks — the work queue showing what needs to be collected, by whom, and by when. Optionally filter by assignee or status.",
    {
      org_id: z.string().uuid().optional().describe("Organization UUID — obtain from scf_list_organizations"),
      assignee: z.string().optional().describe("Filter by assigned user ID"),
      status: z.string().optional().describe("Filter by task status (e.g., 'open', 'in_progress', 'done')"),
    },
    async ({ org_id, assignee, status }) => {
      try {
        const client = getClient();
        const data = await client.get("/evidence-tasks", { org_id, assignee, status });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Windowed AI Evidence Assessment (M1a)
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_trigger_window_assessment",
    "Queue a windowed AI assessment that scores every file in the evidence item's frequency window as one portfolio (write — editor+ role, async). Returns 422 if tracking or frequency is missing.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z
        .string()
        .describe(
          "Evidence ID (e.g., 'E-IAM-01'). Tracking row with a frequency must exist — set via scf_update_evidence first",
        ),
      assessment_source: z
        .enum(["on_demand", "auto", "bulk"])
        .optional()
        .default("on_demand")
        .describe("Origin tag for the request (default on_demand)"),
    },
    async ({ org_id, evidence_id, assessment_source }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence/${evidence_id}/assess-window`, {
          assessment_source,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_window_assessments",
    "List recent windowed AI assessments for an evidence item (newest first). Each entry includes window bounds, frequency, file IDs, coverage, status, relevance score, findings, and cost.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'E-IAM-01') — obtain from scf_list_evidence"),
      limit: z.number().int().min(1).max(100).optional().default(10).describe("Page size (1–100, default 10)"),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("Pagination offset — number of results to skip (default 0)"),
    },
    async ({ org_id, evidence_id, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/window-assessments`, {
          limit,
          offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_window_assessment",
    "Get one windowed AI assessment by ID. Returns full detail: window bounds, frequency, file IDs, coverage, expected artifact types, status, relevance score, findings, summary, hashes, tokens, cost.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      assessment_id: z.string().uuid().describe("Windowed assessment UUID — obtain from scf_list_window_assessments"),
    },
    async ({ org_id, assessment_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/window-assessments/${assessment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_bulk_assess_windows",
    "Queue windowed AI assessments for up to 25 evidence IDs (write — editor+ role, async). Items without tracking or a frequency set are reported under `skipped_detail` in the response.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_ids: z
        .array(z.string())
        .min(1)
        .max(25)
        .describe("Evidence IDs to assess (e.g., ['E-IAM-01','E-BCM-11']); 1–25 per request"),
    },
    async ({ org_id, evidence_ids }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence/assess-windows-bulk`, { evidence_ids });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_window_assessment_summary",
    "Get aggregate windowed-assessment metrics for the organization dashboard: total windows assessed, counts by status (including `insufficient_sample`), average relevance score, and total cost in cents.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/window-assessments/summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
