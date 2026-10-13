import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";
import {
  DEFICIENCY_PRIORITIES,
  DEFICIENCY_PRIORITIES_PROSE,
  DEFICIENCY_STATUSES,
  DEFICIENCY_STATUSES_PROSE,
} from "../lib/deficiencies.js";
import { EFFECTIVENESS_RATINGS, EFFECTIVENESS_RATINGS_PROSE } from "../lib/effectiveness-ratings.js";
import {
  CAPABILITY_TEST_RESULTS,
  CAPABILITY_TEST_RESULTS_PROSE,
  CAPABILITY_TEST_TYPES,
  CAPABILITY_TEST_TYPES_PROSE,
} from "../lib/capability-tests.js";

// Assurance records the platform keeps against the organisation's own controls and risks (PIG R8–R11):
// deficiencies, organisation compensating controls, the due-care pack (control validation and monthly
// posture snapshots) and capability tests. Vendor action items and vendor compensating controls live in
// vendors.ts; these are the organisation-level counterparts.

const OrgId = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const ScfId = z.string().max(50);

const DeficiencyPriority = z.enum(DEFICIENCY_PRIORITIES);
const DeficiencyStatus = z.enum(DEFICIENCY_STATUSES);
const EffectivenessRating = z.enum(EFFECTIVENESS_RATINGS);
const CapabilityTestType = z.enum(CAPABILITY_TEST_TYPES);
const CapabilityTestResult = z.enum(CAPABILITY_TEST_RESULTS);

const VALIDATION_STATES = ["current", "due_soon", "overdue", "never", "unknown_cadence"] as const;

/** One capability-test finding. The platform records each as a deficiency linked to the test. */
const Finding = z
  .object({
    title: z.string().min(1).max(255).describe("Short title of the finding (1–255 chars, non-blank)"),
    description: z.string().optional().describe("What was found"),
    priority: DeficiencyPriority.optional().describe(
      `Priority: ${DEFICIENCY_PRIORITIES_PROSE} (platform default medium)`,
    ),
    owner_name: z.string().max(255).optional().describe("Free-text owner"),
    owner_user_id: z
      .string()
      .uuid()
      .optional()
      .describe("Owner user — must be a member of the organisation (404 otherwise); see scf_list_members"),
    due_date: IsoDate.optional().describe("Due date (YYYY-MM-DD)"),
    scf_id: ScfId.optional().describe("Control the finding is against, if any — must be in scope (422 otherwise)"),
    risk_code: z.string().max(50).optional().describe("Risk the finding is against, if any — must be assessed"),
    root_cause: z.string().optional().describe("Why the finding arose"),
  })
  .strict();

export function registerAssuranceTools(server: McpServer) {
  // ---------------------------------------------------------------------------
  // Deficiencies (PIG R8)
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_list_deficiencies",
    "List the organisation's control deficiencies, newest first: hand-raised ones and those the platform raises (control at risk, insufficient composite, rejected evidence, capability tests).",
    {
      org_id: OrgId,
      status: DeficiencyStatus.optional().describe(`Filter by status: ${DEFICIENCY_STATUSES_PROSE}`),
      open_only: z.boolean().optional().describe("Only open and in-progress deficiencies"),
      scf_id: z
        .string()
        .optional()
        .describe("Deficiencies against this control — obtain from scf_list_scoped_controls"),
      domain: z.string().optional().describe("Deficiencies against controls in this SCF domain code"),
      risk_code: z.string().optional().describe("Deficiencies against this risk code"),
      capability_test_id: z
        .string()
        .uuid()
        .optional()
        .describe("Findings of this capability test — obtain from scf_list_capability_tests"),
    },
    { title: "List Deficiencies", readOnlyHint: true },
    async ({ org_id, status, open_only, scf_id, domain, risk_code, capability_test_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/deficiencies`, {
          status,
          open_only,
          scf_id,
          domain,
          risk_code,
          capability_test_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_deficiency_summary",
    "Summarise open deficiencies: open_total, material_open_total, unlinked_open, and open counts per control (with material flag) and per domain.",
    { org_id: OrgId },
    { title: "Get Deficiency Summary", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/deficiencies/summary`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_deficiency",
    "Get one deficiency: title, priority, status, owner, due date, control or risk it is against, source, root cause, retest note and who closed it.",
    {
      org_id: OrgId,
      deficiency_id: z.string().uuid().describe("Deficiency UUID — obtain from scf_list_deficiencies"),
    },
    { title: "Get Deficiency", readOnlyHint: true },
    async ({ org_id, deficiency_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/deficiencies/${deficiency_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_deficiency",
    "Raise a deficiency by hand (write — editor) against an in-scope control, an assessed risk, or both. At least one of scf_id or risk_code is required. Starts open.",
    {
      org_id: OrgId,
      title: z.string().min(1).max(255).describe("Short title (1–255 chars, non-blank)"),
      description: z.string().optional().describe("What is deficient"),
      priority: DeficiencyPriority.optional().describe(
        `Priority: ${DEFICIENCY_PRIORITIES_PROSE} (platform default medium)`,
      ),
      owner_name: z.string().max(255).optional().describe("Free-text owner"),
      owner_user_id: z
        .string()
        .uuid()
        .optional()
        .describe("Owner user — must be a member of the organisation (404 otherwise); see scf_list_members"),
      due_date: IsoDate.optional().describe("Due date (YYYY-MM-DD)"),
      scf_id: ScfId.optional().describe(
        "Control the deficiency is against — must be in scope (422 otherwise); obtain from scf_list_scoped_controls",
      ),
      risk_code: z
        .string()
        .max(50)
        .optional()
        .describe("Risk the deficiency is against — must be one the organisation has assessed (422 otherwise)"),
      root_cause: z.string().optional().describe("Why the deficiency arose"),
    },
    { title: "Create Deficiency", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/deficiencies`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_deficiency",
    "Update a deficiency (write — editor). Only passed fields change. Completing needs a retest_note. There is no delete: set status cancelled instead.",
    {
      org_id: OrgId,
      deficiency_id: z.string().uuid().describe("Deficiency UUID — obtain from scf_list_deficiencies"),
      title: z.string().min(1).max(255).optional().describe("New title (cannot be cleared)"),
      description: z.string().nullable().optional().describe("New description, or null to clear"),
      priority: DeficiencyPriority.optional().describe(`Priority: ${DEFICIENCY_PRIORITIES_PROSE} (cannot be cleared)`),
      status: DeficiencyStatus.optional().describe(
        `Status: ${DEFICIENCY_STATUSES_PROSE} (cannot be cleared). Moving to completed needs retest_note (422 otherwise). Restoring a cancelled capability-test finding is refused while that test is recorded as passed`,
      ),
      owner_name: z.string().max(255).nullable().optional().describe("Free-text owner, or null to clear"),
      owner_user_id: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe("Owner user (must be an org member, 404 otherwise), or null to clear"),
      due_date: IsoDate.nullable().optional().describe("Due date (YYYY-MM-DD), or null to clear"),
      retest_note: z
        .string()
        .optional()
        .describe(
          "What was retested and the result. Required to complete. Ignored when reopening: a reopened deficiency starts without one",
        ),
      root_cause: z.string().nullable().optional().describe("Why it arose; null or blank clears it"),
    },
    { title: "Update Deficiency", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, deficiency_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/deficiencies/${deficiency_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Organisation compensating controls (PIG R9)
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_list_org_compensating_controls",
    "List compensating controls recorded against the organisation's own controls (not vendor ones), with material, risk_acceptance_state and justified flags.",
    {
      org_id: OrgId,
      scf_id: z.string().optional().describe("Compensating controls for this control"),
      domain: z.string().optional().describe("Compensating controls for controls in this SCF domain code"),
      risk_code: z.string().optional().describe("Compensating controls justified by this risk code"),
    },
    { title: "List Org Compensating Controls", readOnlyHint: true },
    async ({ org_id, scf_id, domain, risk_code }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/compensating-controls`, { scf_id, domain, risk_code });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_org_compensating_control",
    "Get one organisation compensating control: gap, what compensates, effectiveness, risk_code, and whether it is still justified.",
    {
      org_id: OrgId,
      cc_id: z.string().uuid().describe("Compensating control UUID — obtain from scf_list_org_compensating_controls"),
    },
    { title: "Get Org Compensating Control", readOnlyHint: true },
    async ({ org_id, cc_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/compensating-controls/${cc_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_org_compensating_control",
    "Record a compensating control for an in-scope control (write — editor). A material control needs risk_code: an accepted, linked risk with an approval in force (409 otherwise).",
    {
      org_id: OrgId,
      scf_id: ScfId.min(1).describe(
        "Control the gap is in — must be in scope (422 otherwise); obtain from scf_list_scoped_controls",
      ),
      gap_description: z.string().min(1).describe("What the control does not meet (non-blank)"),
      compensating_control: z.string().min(1).describe("What compensates for the gap (non-blank)"),
      effectiveness_rating: EffectivenessRating.optional().describe(
        `Effectiveness: ${EFFECTIVENESS_RATINGS_PROSE} (platform default partial)`,
      ),
      risk_reduction_notes: z.string().optional().describe("Notes on how the risk is reduced"),
      risk_code: z
        .string()
        .max(50)
        .optional()
        .describe(
          "Accepted risk that justifies compensating: one linked to the control and assessed by the org. Required on a material control, where its approval must be in force",
        ),
    },
    { title: "Create Org Compensating Control", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/compensating-controls`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_org_compensating_control",
    "Update an organisation compensating control (write — editor). Only passed fields change; the control it is for does not. A changed risk_code is re-checked (409).",
    {
      org_id: OrgId,
      cc_id: z.string().uuid().describe("Compensating control UUID — obtain from scf_list_org_compensating_controls"),
      gap_description: z.string().min(1).optional().describe("What the control does not meet (cannot be cleared)"),
      compensating_control: z.string().min(1).optional().describe("What compensates (cannot be cleared)"),
      effectiveness_rating: EffectivenessRating.optional().describe(
        `Effectiveness: ${EFFECTIVENESS_RATINGS_PROSE} (cannot be cleared)`,
      ),
      risk_reduction_notes: z.string().nullable().optional().describe("Risk reduction notes, or null to clear"),
      risk_code: z
        .string()
        .max(50)
        .nullable()
        .optional()
        .describe(
          "Justifying accepted risk, re-checked as on create; null clears it, which a material control refuses",
        ),
    },
    { title: "Update Org Compensating Control", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, cc_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/compensating-controls/${cc_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_org_compensating_control",
    "Withdraw an organisation compensating control (write — editor). The audit log keeps what it said.",
    {
      org_id: OrgId,
      cc_id: z.string().uuid().describe("Compensating control UUID — obtain from scf_list_org_compensating_controls"),
    },
    { title: "Delete Org Compensating Control", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, cc_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/compensating-controls/${cc_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Due care (PIG R10): control validation and posture snapshots
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_record_control_validation",
    "Record that an in-scope control was validated (write — editor): the note is the record. The control's cadence then sets when the next validation is due.",
    {
      org_id: OrgId,
      scf_id: z.string().describe("In-scope control (422 otherwise) — obtain from scf_list_scoped_controls"),
      note: z.string().min(1).describe("What was checked and what was found (required, non-blank)"),
    },
    { title: "Record Control Validation", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, scf_id, note }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/scoped-controls/${scf_id}/validation`, { note });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_control_validations",
    "List the validation schedule: each in-scope control's cadence, last validation, next due date and state, plus counts per state (taken before the state filter).",
    {
      org_id: OrgId,
      state: z
        .enum(VALIDATION_STATES)
        .optional()
        .describe(
          "Filter by state: current, due_soon (due within 30 days), overdue, never (not validated) or unknown_cadence",
        ),
      domain: z.string().optional().describe("Controls in this SCF domain code"),
      scf_id: z.string().optional().describe("One control"),
    },
    { title: "List Control Validations", readOnlyHint: true },
    async ({ org_id, state, domain, scf_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/control-validations`, { state, domain, scf_id });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_posture_snapshots",
    "List the organisation's monthly posture snapshots, most recent month first: period, when and how taken (scheduled or manual), and the counts recorded.",
    {
      org_id: OrgId,
      limit: z.number().int().min(1).max(120).optional().describe("How many months to return (1–120, default 24)"),
    },
    { title: "List Posture Snapshots", readOnlyHint: true },
    async ({ org_id, limit }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/posture-snapshots`, { limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_posture_snapshot",
    "Get one month's posture snapshot by period (YYYY-MM). 404 if that month has none.",
    {
      org_id: OrgId,
      period: z
        .string()
        .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
        .describe("Month of the snapshot, YYYY-MM (e.g. 2026-09)"),
    },
    { title: "Get Posture Snapshot", readOnlyHint: true },
    async ({ org_id, period }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/posture-snapshots/${period}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_take_posture_snapshot",
    "Take this month's posture snapshot now (write — editor). The schedule takes one on the 1st; a month has one snapshot, so a second is refused (409).",
    { org_id: OrgId },
    { title: "Take Posture Snapshot", readOnlyHint: false, destructiveHint: false },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/posture-snapshots`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Capability tests (PIG R11)
  // ---------------------------------------------------------------------------

  server.tool(
    "scf_list_capability_tests",
    "List capability tests (incident response exercises, continuity tests, others), most recently run first, with finding_count and open_finding_count.",
    {
      org_id: OrgId,
      test_type: CapabilityTestType.optional().describe(`Filter by type: ${CAPABILITY_TEST_TYPES_PROSE}`),
      since: IsoDate.optional().describe("Tests run on or after this date (YYYY-MM-DD)"),
    },
    { title: "List Capability Tests", readOnlyHint: true },
    async ({ org_id, test_type, since }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-tests`, { test_type, since });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_capability_test",
    "Get one capability test with its findings, each returned as a deficiency.",
    {
      org_id: OrgId,
      test_id: z.string().uuid().describe("Capability test UUID — obtain from scf_list_capability_tests"),
    },
    { title: "Get Capability Test", readOnlyHint: true },
    async ({ org_id, test_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/capability-tests/${test_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_capability_test",
    "Record a capability test as run (write — editor). Each finding becomes a deficiency. passed needs no findings; passed_with_findings or failed need at least one (422).",
    {
      org_id: OrgId,
      test_type: CapabilityTestType.describe(`Kind of test: ${CAPABILITY_TEST_TYPES_PROSE}`),
      title: z.string().min(1).max(255).describe("Short title (1–255 chars, non-blank)"),
      tested_on: IsoDate.describe("Day the test was run (YYYY-MM-DD); not in the future (422)"),
      scenario: z.string().min(1).describe("What was tested, and how (non-blank)"),
      result: CapabilityTestResult.describe(
        `Result: ${CAPABILITY_TEST_RESULTS_PROSE}. passed means no findings; the others need at least one`,
      ),
      outcome: z.string().min(1).describe("What happened, and what was learned (non-blank)"),
      findings: z
        .array(Finding)
        .max(100)
        .optional()
        .describe("Findings (up to 100); each is recorded as a deficiency linked to the test"),
    },
    { title: "Create Capability Test", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/capability-tests`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_capability_test",
    "Correct a capability test (write — editor). Only passed fields change; none can be cleared. findings sent here are added. The result must still agree with the findings.",
    {
      org_id: OrgId,
      test_id: z.string().uuid().describe("Capability test UUID — obtain from scf_list_capability_tests"),
      test_type: CapabilityTestType.optional().describe(`Kind of test: ${CAPABILITY_TEST_TYPES_PROSE}`),
      title: z.string().min(1).max(255).optional().describe("New title"),
      tested_on: IsoDate.optional().describe("Day the test was run (YYYY-MM-DD); not in the future"),
      scenario: z.string().min(1).optional().describe("What was tested, and how"),
      result: CapabilityTestResult.optional().describe(
        `Result: ${CAPABILITY_TEST_RESULTS_PROSE}. Checked against recorded findings (cancelled excluded) plus any sent here; to correct passed to failed, send the result and a finding together`,
      ),
      outcome: z.string().min(1).optional().describe("What happened, and what was learned"),
      findings: z
        .array(Finding)
        .max(100)
        .optional()
        .describe("Findings to add with this correction. Existing findings are managed as deficiencies"),
    },
    { title: "Update Capability Test", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, test_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/capability-tests/${test_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_add_capability_test_finding",
    "Add a finding to a capability test (write — editor); it is recorded as a deficiency linked to the test. Refused on a test recorded as passed: correct its result instead.",
    {
      org_id: OrgId,
      test_id: z.string().uuid().describe("Capability test UUID — obtain from scf_list_capability_tests"),
      ...Finding.shape,
    },
    { title: "Add Capability Test Finding", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, test_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/capability-tests/${test_id}/findings`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
