import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

/**
 * Body of both verdict-review tools (per-file and window). The platform's AOOverrideRequestItem is one
 * schema for both routes, so the two tools share one definition and cannot drift apart.
 */
const verdictReviewFields = {
  decision: z
    .enum(["confirmed", "overridden"])
    .describe("confirmed = AI verdict stands; overridden = you are changing it"),
  reason: z.string().optional().describe("Why the verdict is overridden — required when decision is overridden"),
  ao_overrides: z
    .array(
      z.object({
        ao_id: z.string().min(1).describe("Assessment objective ID"),
        human_designation: z
          .enum(["appears_satisfied", "gap_identified", "not_applicable", "cannot_assess"])
          .describe("Reviewer's designation for this objective"),
        note: z.string().optional().describe("Why, for this objective specifically"),
      }),
    )
    .optional()
    .describe(
      "Objectives to re-designate — required (≥1) when overriding, forbidden when confirming; unlisted objectives keep the AI's designation. 422 if the version has no per-objective answers: confirm instead",
    ),
};

export function registerEvidenceTools(server: McpServer) {
  server.tool(
    "scf_list_evidence",
    "List evidence items tracked against an organization's controls. Returns each item's tracking status, maturity level, and linked controls. Optionally filter by system.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      system_id: z.string().uuid().optional().describe("System UUID to filter by — obtain from scf_list_systems"),
    },
    { title: "List Evidence", readOnlyHint: true },
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
      maturity_level: z
        .string()
        .regex(/^L[0-5]$/)
        .optional()
        .describe("Evidence maturity level L0–L5 (e.g., 'L3'); omit to leave unset"),
      comments: z.string().optional().describe("Free-text notes or context"),
    },
    { title: "Create Evidence Tracking", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Evidence Maturity", readOnlyHint: true },
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
    "scf_get_evidence_item_maturity",
    "Get one evidence item's collection maturity: current level (1=Ad Hoc to 5=Optimized), contributing factors, upgrade potential, and tracking state.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'E-RSK-02') — obtain from scf_list_evidence"),
    },
    { title: "Get Evidence Item Maturity", readOnlyHint: true },
    async ({ org_id, evidence_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/maturity`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_upgrade_recommendations",
    "Get upgrade-path recommendations for maturing one evidence item's collection: target level, effort, impact, and step-by-step actions — the same guidance shown in the platform UI.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'E-RSK-02') — obtain from scf_list_evidence"),
    },
    { title: "Get Evidence Upgrade Recommendations", readOnlyHint: true },
    async ({ org_id, evidence_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/upgrade-recommendations`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_suggestions",
    "Get system-aware collection suggestions for one evidence item: which tracked system currently collects it, which in-scope systems are capable of collecting it, and tailored collection guidance.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Evidence ID (e.g., 'E-RSK-02') — obtain from scf_list_evidence"),
    },
    { title: "Get Evidence Suggestions", readOnlyHint: true },
    async ({ org_id, evidence_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/${evidence_id}/suggestions`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_evidence_gaps",
    "List the organization's evidence coverage gaps: evidence required by in-scope controls that is not yet tracked, with overall coverage percentage.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "List Evidence Gaps", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-gaps`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_health",
    "Get evidence collection health for the organization: per-item freshness status (green/amber/red) against collection frequency, with a roll-up summary.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Evidence Health", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-health`);
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
    { title: "List Evidence Files", readOnlyHint: true },
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
    { title: "Get Evidence File", readOnlyHint: true },
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
      maturity_level: z
        .string()
        .regex(/^L[0-5]$/)
        .optional()
        .describe("Evidence maturity level L0–L5 (e.g., 'L3'); omitting never clears the stored value"),
      comments: z.string().optional().describe("Free-text notes or context"),
    },
    { title: "Update Evidence", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Evidence Validation", readOnlyHint: true },
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
    { title: "Revalidate Evidence File", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Evidence Validation Summary", readOnlyHint: true },
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
    { title: "Trigger Evidence Assessment", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Evidence Assessment", readOnlyHint: true },
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
    { title: "Bulk Assess Evidence", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Evidence Assessment Summary", readOnlyHint: true },
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
      assignee: z.string().uuid().optional().describe("Filter by assigned user UUID"),
      status: z
        .enum(["not_started", "in_progress", "completed"])
        .optional()
        .describe("Filter by task status: not_started, in_progress or completed"),
      overdue_only: z.boolean().optional().describe("Only tasks past their due date"),
      assigned_to_me: z.boolean().optional().describe("Only tasks assigned to the caller"),
      evidence_tracking_id: z.string().uuid().optional().describe("Only tasks for one evidence tracking record"),
    },
    { title: "List Evidence Tasks", readOnlyHint: true },
    async ({ org_id, assignee, status, overdue_only, assigned_to_me, evidence_tracking_id }) => {
      try {
        const client = getClient();
        // Platform query names differ from the tool's: organization_id / assigned_user_id / status_filter.
        const data = await client.get("/evidence-tasks", {
          organization_id: org_id,
          assigned_user_id: assignee,
          status_filter: status,
          overdue_only,
          assigned_to_me,
          evidence_tracking_id,
        });
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
    { title: "Trigger Window Assessment", readOnlyHint: false, destructiveHint: false },
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
    { title: "List Window Assessments", readOnlyHint: true },
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
    { title: "Get Window Assessment", readOnlyHint: true },
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
    { title: "Bulk Assess Windows", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Window Assessment Summary", readOnlyHint: true },
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

  // ---------------------------------------------------------------------------
  // Control Assessment Composite (M3 — issue #569)
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_get_control_assessment_composite",
    "Get the rolled-up assessment composite for one SCF control: composite score, status band, included/missing evidence IDs, mandatory gaps, per-window detail. 404 if no composite row exists yet (async).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format (e.g., 'AST-01', 'GOV-02')"),
    },
    { title: "Get Control Assessment Composite", readOnlyHint: true },
    async ({ org_id, scf_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/controls/${scf_id}/assessment-composite`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_control_assessment_composites",
    "List rolled-up assessment composites for the org. Cursor-paginated, worst-band first (insufficient → sufficient). Filter by status/domain/computation_version. Pass next_cursor to page forward.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      status: z
        .string()
        .optional()
        .describe(
          "Comma-separated composite_status values to include (e.g., 'insufficient,partial'). Valid values: insufficient, insufficient_sample, partial, pending, no_evidence, sufficient",
        ),
      domain: z.string().optional().describe("Filter by SCF domain code (e.g., 'BCD', 'GOV', 'AST')"),
      computation_version: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Restrict to composites computed at this algorithm version"),
      limit: z.number().int().min(1).max(500).optional().default(100).describe("Page size (1–500, default 100)"),
      cursor: z.string().optional().describe("Opaque pagination cursor — pass next_cursor from a prior response"),
    },
    { title: "List Control Assessment Composites", readOnlyHint: true },
    async ({ org_id, status, domain, computation_version, limit, cursor }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/controls/assessment-composites`, {
          status,
          domain,
          computation_version,
          limit,
          cursor,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Evidence Record Reads & Batch Writes
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_get_evidence",
    "Get one evidence tracking record (read — viewer role): tracked flag, collection method, owner, assignee, frequency, system, maturity level and its catalog deprecation badge.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Catalog evidence ID, e.g. E-IAM-01 — obtain from scf_list_evidence_catalog"),
    },
    { title: "Get Evidence", readOnlyHint: true },
    async ({ org_id, evidence_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-tracking/${evidence_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_batch_update_evidence",
    "Create or update up to 500 evidence tracking records in one transaction (write — editor role). Each upserts by evidence_id; only fields given change. Use instead of 500 scf_update_evidence calls.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      operations: z
        .array(
          z.object({
            evidence_id: z.string().describe("Catalog evidence ID, e.g. E-IAM-01"),
            is_tracked: z.boolean().optional().describe("Toggle active tracking for this item"),
            method_of_collection: z
              .string()
              .optional()
              .describe("Collection approach: 'automated', 'manual', or 'hybrid'"),
            collecting_system: z.string().optional().describe("Name of the tool or system that collects the evidence"),
            assigned_user_id: z
              .string()
              .uuid()
              .optional()
              .describe(
                "User responsible for collecting — becomes assignee on generated tasks; must be in the owning team",
              ),
            owner_user_id: z
              .string()
              .uuid()
              .optional()
              .describe("User accountable for this evidence — task assignee when assigned_user_id is unset"),
            frequency: z.string().optional().describe("Collection frequency, e.g. 'monthly', 'quarterly', 'annual'"),
            comments: z.string().optional().describe("Free-text notes on this evidence item"),
            maturity_level: z
              .enum(["L0", "L1", "L2", "L3", "L4", "L5"])
              .optional()
              .describe("Evidence collection maturity level L0–L5"),
            system_id: z
              .string()
              .uuid()
              .optional()
              .describe("System that collects this evidence — obtain from scf_list_systems"),
          }),
        )
        .min(1)
        .max(500)
        .describe("Upsert operations, max 500 — each keyed by evidence_id"),
    },
    { title: "Batch Update Evidence", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, operations }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence-tracking/batch`, { operations });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Evidence Task Lifecycle
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_create_evidence_task",
    "Create a manual evidence collection task against a tracking record (write — editor role). Due date and evidence_tracking_id are required; status defaults to not_started, priority to medium.",
    {
      evidence_tracking_id: z
        .string()
        .uuid()
        .describe("Evidence tracking record UUID (the id field from scf_list_evidence, not the E-xxx catalog id)"),
      due_date: z.string().describe("Due date, YYYY-MM-DD"),
      title: z.string().optional().describe("Task title"),
      description: z.string().optional().describe("What has to be collected and how"),
      task_type: z
        .enum(["feasibility", "setup", "collection", "review", "documentation", "issue"])
        .optional()
        .describe("Task type (default collection)"),
      priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Priority (default medium)"),
      status: z
        .enum(["not_started", "in_progress", "completed"])
        .optional()
        .describe("Initial status (default not_started)"),
      assigned_user_id: z.string().uuid().optional().describe("Assignee user UUID — obtain from scf_list_members"),
      owning_team_id: z.string().uuid().optional().describe("Team that owns the task — obtain from scf_list_teams"),
    },
    { title: "Create Evidence Task", readOnlyHint: false, destructiveHint: false },
    async (fields) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.post("/evidence-tasks", body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_evidence_task",
    "Update an evidence collection task (write — editor role). Only passed fields change: due date, status, type, priority, title, description, notes, assignee, owning team.",
    {
      task_id: z.string().uuid().describe("Evidence task UUID — obtain from scf_list_evidence_tasks"),
      due_date: z.string().optional().describe("Due date, YYYY-MM-DD"),
      title: z.string().optional().describe("Task title"),
      description: z.string().optional().describe("What has to be collected and how"),
      task_type: z
        .enum(["feasibility", "setup", "collection", "review", "documentation", "issue"])
        .optional()
        .describe("Task type"),
      priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Priority"),
      status: z.enum(["not_started", "in_progress", "completed"]).optional().describe("Status"),
      assigned_user_id: z.string().uuid().optional().describe("Assignee user UUID — obtain from scf_list_members"),
      owning_team_id: z.string().uuid().optional().describe("Team that owns the task — obtain from scf_list_teams"),
      completion_notes: z.string().optional().describe("Notes recorded on completion"),
    },
    { title: "Update Evidence Task", readOnlyHint: false, destructiveHint: false },
    async ({ task_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.patch(`/evidence-tasks/${task_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_complete_evidence_task",
    "Mark an evidence collection task completed (write — editor role). Sets status to completed and stamps the completion date; optional completion notes are stored with it.",
    {
      task_id: z.string().uuid().describe("Evidence task UUID — obtain from scf_list_evidence_tasks"),
      completion_notes: z.string().optional().describe("Notes recorded on completion"),
    },
    { title: "Complete Evidence Task", readOnlyHint: false, destructiveHint: false },
    async ({ task_id, completion_notes }) => {
      try {
        const client = getClient();
        const data = await client.post(`/evidence-tasks/${task_id}/complete`, undefined, { completion_notes });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Evidence File Review & Deletion
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_review_evidence_file",
    "Approve, reject or request revision on one uploaded file (write — editor role). Returns 410 where per-window review is enabled — use scf_review_window_assessment there.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Catalog evidence ID the file belongs to, e.g. E-IAM-01"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
      review_status: z.enum(["approved", "rejected", "needs_revision"]).describe("Review decision"),
      review_notes: z.string().optional().describe("Reviewer notes"),
    },
    { title: "Review Evidence File", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, evidence_id, file_id, review_status, review_notes }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/review`, {
          review_status,
          review_notes,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_evidence_file",
    "Soft-delete an evidence file (destructive write — editor role). The record is marked deleted and drops out of listings; the stored object is retained for audit and retention.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Catalog evidence ID the file belongs to, e.g. E-IAM-01"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
    },
    { title: "Delete Evidence File", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, evidence_id, file_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Evidence Cadence Health
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_get_upcoming_evidence",
    "List evidence whose next collection falls due within N days (read — viewer role), computed from each item's frequency and last upload. The daily 'what is due' view.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      days: z.number().int().min(1).max(90).default(14).describe("Look-ahead window in days (1–90, default 14)"),
    },
    { title: "Get Upcoming Evidence", readOnlyHint: true },
    async ({ org_id, days }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence-health/upcoming`, { days });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_frequency_health",
    "Report evidence whose declared frequency disagrees with the observed upload cadence over the last 90 days (read — viewer role). Only misaligned items are returned.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Frequency Health", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/frequency-health`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // AI Assessment Human Review
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_get_assessment_review_queue",
    "List AI verdicts awaiting a human decision, worst first (read — viewer role). tier=file (default) lists per-file verdicts; tier=window is the web app's Awaiting-confirmation queue.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      tier: z
        .enum(["file", "window"])
        .default("file")
        .describe(
          "file (default): entries carry file_id, act with scf_review_evidence_assessment. window: entries carry window_assessment_id, act with scf_review_window_assessment_verdict",
        ),
      status: z.enum(["awaiting", "reviewed", "all"]).default("awaiting").describe("Queue filter (default awaiting)"),
      limit: z.number().int().min(1).max(200).default(50).describe("Page size (1–200, default 50)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset (default 0)"),
    },
    { title: "Get Assessment Review Queue", readOnlyHint: true },
    async ({ org_id, tier, status, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/assessment/review-queue`, {
          tier,
          status,
          limit,
          offset,
        });
        // Platforms before v1.192.1 ignore `tier` and answer with per-file entries (no `kind`); never
        // present those as window verdicts.
        const items = (data as { items?: Array<{ kind?: string }> } | null)?.items;
        if (tier === "window" && Array.isArray(items) && items.some((item) => (item.kind ?? "file") !== "window")) {
          return errorResult(
            new Error(
              "This platform ignored tier=window and returned per-file entries; the window review queue needs scf-controls-platform v1.192.1 or later. Use tier=file on this platform.",
            ),
          );
        }
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_review_evidence_assessment",
    "Record a human decision on a file's current AI assessment (write — editor role). confirmed keeps the verdict; overridden needs a reason and at least one objective re-designation.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      evidence_id: z.string().describe("Catalog evidence ID the file belongs to, e.g. E-IAM-01"),
      file_id: z.string().uuid().describe("Evidence file UUID — obtain from scf_list_evidence_files"),
      ...verdictReviewFields,
    },
    { title: "Review Evidence Assessment", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, evidence_id, file_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.post(
          `/organizations/${org_id}/evidence/${evidence_id}/files/${file_id}/assessment/review`,
          body,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_refresh_stale_window_assessments",
    "Queue a fresh windowed AI assessment for every evidence item whose newest file postdates its last assessment (write — editor role). Capped per run; returns how many were queued.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Refresh Stale Window Assessments", readOnlyHint: false, destructiveHint: false },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/evidence/window-assessments/refresh-stale`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_review_window_assessment",
    "Set the acceptance review of a windowed assessment (write — editor role): approved, rejected, needs_revision, or not_reviewed to revoke. Verdict itself: scf_review_window_assessment_verdict.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      ewa_id: z.string().uuid().describe("Window assessment UUID — obtain from scf_list_window_assessments"),
      review_status: z
        .enum(["approved", "rejected", "needs_revision", "not_reviewed"])
        .describe("Review state to set; not_reviewed revokes"),
      review_notes: z.string().optional().describe("Reviewer notes"),
    },
    { title: "Review Window Assessment", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ewa_id, review_status, review_notes }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/window-assessments/${ewa_id}/review`, {
          review_status,
          review_notes,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_review_window_assessment_verdict",
    "Confirm or override a window's current AI verdict (write — editor role). overridden needs a reason and ≥1 objective re-designation. One decision per version; 422 without objectives: confirm.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      assessment_id: z
        .string()
        .uuid()
        .describe(
          "Window assessment UUID — obtain from scf_get_assessment_review_queue (window_assessment_id) or scf_list_window_assessments",
        ),
      ...verdictReviewFields,
    },
    { title: "Review Window Assessment Verdict", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, assessment_id, ...fields }) => {
      try {
        const client = getClient();
        const data = await client.post(
          `/organizations/${org_id}/evidence/window-assessments/${assessment_id}/verdict/review`,
          fields,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_window_assessment_versions",
    "List every AI verdict a window assessment has received, newest first (read — viewer role). Each version is frozen as reached (model, prompt version, designations) plus any human decision on it.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      assessment_id: z.string().uuid().describe("Window assessment UUID — obtain from scf_list_window_assessments"),
    },
    { title: "Get Window Assessment Versions", readOnlyHint: true },
    async ({ org_id, assessment_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/evidence/window-assessments/${assessment_id}/versions`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
