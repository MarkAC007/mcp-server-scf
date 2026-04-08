import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerEvidenceTools(server: McpServer) {
  server.tool(
    "list_evidence",
    "List evidence items tracked for an organization's controls. Evidence demonstrates control implementation for audit readiness. Returns evidence with status, maturity, and linked controls.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      system_id: z.string().optional().describe("Filter by system ID"),
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
    "create_evidence",
    "Create an evidence tracking record from the SCF evidence catalog. Uses a catalog evidence ID (e.g., 'E-IAM-01') to start tracking an evidence item for the organization.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Catalog evidence ID (e.g., 'E-IAM-01') — get from list_evidence_catalog"),
      is_tracked: z.boolean().default(false).describe("Whether this evidence item is actively tracked"),
      system_id: z.string().optional().describe("System ID (UUID) to link this evidence to — get from list_systems"),
      method_of_collection: z.string().optional().describe("How the evidence is collected (e.g., 'automated', 'manual', 'hybrid')"),
      collecting_system: z.string().optional().describe("System or tool used to collect the evidence"),
      owner: z.string().optional().describe("Person responsible for this evidence item"),
      frequency: z.string().optional().describe("How often evidence is collected (e.g., 'daily', 'weekly', 'monthly', 'quarterly', 'annually')"),
      comments: z.string().optional().describe("Additional notes or context about this evidence item"),
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
    "get_evidence_maturity",
    "Get evidence maturity summary for an organization. Shows average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
    "list_evidence_files",
    "List all evidence files uploaded or ingested for a specific evidence item. Returns file metadata including filename, content type, upload timestamp, validation status, and a pre-signed download URL (15-min expiry). Use this to see what artifacts have been collected for an evidence item.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — get from list_evidence"),
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
    "get_evidence_file",
    "Get metadata and a pre-signed download URL for a single evidence file. The download URL expires after 15 minutes. Use this to inspect or retrieve a specific uploaded artifact.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — get from list_evidence"),
      file_id: z.string().describe("Evidence file ID (UUID) — get from list_evidence_files"),
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
    "update_evidence",
    "Update an evidence item's tracking fields — toggle tracking, link to a system, set collection method, owner, frequency, etc. Use the catalog evidence ID (e.g., 'E-IAM-01') as the identifier. All fields except org_id and evidence_id are optional — only provided fields are updated.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Catalog evidence ID (e.g., 'E-IAM-01') — get from list_evidence or list_evidence_catalog"),
      is_tracked: z.boolean().optional().describe("Whether this evidence item is actively tracked for the organization"),
      system_id: z.string().optional().describe("System ID (UUID) to link this evidence to — get from list_systems"),
      method_of_collection: z.string().optional().describe("How the evidence is collected (e.g., 'automated', 'manual', 'hybrid')"),
      collecting_system: z.string().optional().describe("System or tool used to collect the evidence"),
      owner: z.string().optional().describe("Person responsible for this evidence item"),
      frequency: z.string().optional().describe("How often evidence is collected (e.g., 'daily', 'weekly', 'monthly', 'quarterly', 'annually')"),
      comments: z.string().optional().describe("Additional notes or context about this evidence item"),
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
    "get_evidence_validation",
    "Get the validation result for a specific evidence file. Returns overall status (valid/warning/partial/invalid), completeness score, individual rule findings (catalog_exists, content_type_ok, field_coverage, freshness, s3_object_exists), validation source, and timestamp.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — get from list_evidence"),
      file_id: z.string().describe("Evidence file ID (UUID) — get from list_evidence_files"),
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
    "revalidate_evidence_file",
    "Re-run the validation engine against a specific evidence file. Checks catalog existence, content type, field coverage, freshness, and storage object existence. Upserts the validation result and returns the updated result. Requires editor role or higher.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — get from list_evidence"),
      file_id: z.string().describe("Evidence file ID (UUID) — get from list_evidence_files"),
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
    "get_evidence_validation_summary",
    "Get aggregate evidence validation metrics for the organisation dashboard. Returns total files validated, counts by status (valid, warning, partial, invalid), and overall pass rate (fraction of files with status=valid).",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
    "trigger_evidence_assessment",
    "Trigger an AI-powered assessment of an evidence artifact file. The assessment evaluates relevance, completeness, and quality against mapped SCF controls. Returns immediately with a pending assessment record — poll with get_evidence_assessment until status changes to sufficient/partial/insufficient. Requires editor role or higher.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — get from list_evidence"),
      file_id: z.string().describe("Evidence file ID (UUID) — get from list_evidence_files"),
      assessment_source: z.enum(["on_demand", "auto", "bulk"]).optional().default("on_demand").describe("Source of the assessment request"),
    },
    async ({ org_id, evidence_id, file_id, assessment_source }) => {
      try {
        const client = getClient();
        const data = await client.post(
          `/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/assess`,
          { assessment_source },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_evidence_assessment",
    "Get the AI assessment result for an evidence artifact file. Returns status (pending/processing/sufficient/partial/insufficient/error), relevance score (0-100), structured findings with categories and suggestions, summary text, and full audit metadata (model, token counts, cost). Poll this after triggering an assessment.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'ERL-IAM-001') — get from list_evidence"),
      file_id: z.string().describe("Evidence file ID (UUID) — get from list_evidence_files"),
    },
    async ({ org_id, evidence_id, file_id }) => {
      try {
        const client = getClient();
        const data = await client.get(
          `/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/assessment`,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "bulk_assess_evidence",
    "Queue AI assessments for multiple evidence files at once (max 50 per request). Provide at least one of: evidence_id (assess all files for that evidence item), file_ids (specific file UUIDs), or assess_unassessed (all files without an existing assessment). Returns the count of queued assessments. Requires editor role or higher.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      evidence_id: z.string().optional().describe("Evidence ID — assess all files for this evidence item"),
      file_ids: z.array(z.string()).optional().describe("Specific evidence file IDs (UUIDs) to assess"),
      assess_unassessed: z.boolean().optional().default(false).describe("Assess all files that have no existing assessment"),
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
    "get_evidence_assessment_summary",
    "Get aggregate AI assessment metrics for the organisation dashboard. Returns total assessed count, counts by status (sufficient/partial/insufficient/pending/error), unassessed count, average relevance score, and total cost in cents.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
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
    "list_evidence_tasks",
    "List evidence collection tasks — the work queue for gathering evidence. Shows what needs to be collected, by whom, and by when.",
    {
      org_id: z.string().optional().describe("Organization ID (UUID)"),
      assignee: z.string().optional().describe("Filter by assigned user"),
      status: z.string().optional().describe("Filter by task status"),
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
}
