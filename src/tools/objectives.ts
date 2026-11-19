import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

// Security objectives (ISO 27001 clause 6.2) and their ISMS metrics (clause 9.1).
// Shapes mirror the platform's backend/services/isms_metrics/schemas.py. The platform
// has no delete route for objectives, metrics or results, and this module wraps none:
// archiving stays a decision a person makes in the UI, so `update` has no `archived`
// field and builds its body from named fields only.

const orgId = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");
const objectiveId = z
  .string()
  .uuid()
  .describe(
    "Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id)",
  );
const isoDate = (what: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date, YYYY-MM-DD")
    .describe(`${what} (YYYY-MM-DD)`);
const text = (max: number, what: string) => z.string().max(max).describe(what);

const KINDS = ["live", "logged", "milestone"] as const;
const UNITS = ["percent", "count"] as const;
const DIRECTIONS = ["at_least", "at_most"] as const;
const FREQUENCIES = ["monthly", "quarterly", "annually"] as const;
const OBJECTIVE_TYPES = ["maintain", "achieve"] as const;
const LIFECYCLE = ["active", "achieved", "missed"] as const;

/** The metric fields, shared by create's `metric` object and set_metric's flat arguments. */
const metricFields = {
  kind: z
    .enum(KINDS)
    .describe(
      "live = computed by the platform from a library measure (needs measure_key); logged = a value people log at a frequency; milestone = done by the due date",
    ),
  measure_key: z
    .string()
    .max(64)
    .optional()
    .describe("Library measure for a live metric — obtain from scf_list_isms_measures"),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Parameters the chosen measure takes, as scf_list_isms_measures lists them"),
  name: text(300, "Metric name; the platform words one from the measure when omitted").optional(),
  description: text(4000, "What the metric measures, in the organization's words").optional(),
  unit: z.enum(UNITS).optional().describe("percent or count (logged metrics; a live measure carries its own)"),
  direction: z.enum(DIRECTIONS).optional().describe("at_least = higher is better; at_most = lower is better"),
  target_value: z.number().finite().optional().describe("Target the result is judged against"),
  warn_value: z
    .number()
    .finite()
    .optional()
    .describe("Warning level: a reading that misses the target but is within this is at_risk; beyond it, off_track"),
  frequency: z.enum(FREQUENCIES).optional().describe("How often a logged value is due"),
  evaluation_method: text(4000, "How the result is evaluated").optional(),
};

const objectiveFields = {
  planned_actions: text(4000, "What will be done to achieve it"),
  resources: text(4000, "Resources it needs"),
  evaluation_method: text(4000, "How its results will be evaluated"),
  objective_type: z
    .enum(OBJECTIVE_TYPES)
    .describe("maintain = hold a level continuously; achieve = reach it by the due date"),
  owning_team_id: z.string().uuid().describe("Responsible team UUID — obtain from scf_list_teams"),
  owner_user_id: z.string().uuid().describe("Accountable member UUID — obtain from scf_list_members"),
  due_date: isoDate("When the objective is to be achieved"),
  review_date: isoDate("Next review"),
  iso_clauses: z
    .array(z.string().max(20))
    .max(20)
    .describe("ISO/IEC 27001 clauses or Annex A controls it supports, e.g. ['6.2', 'A.5.24'] (at most 20)"),
};

/** Drop undefined values so only what the caller gave reaches the platform (an explicit null still clears). */
function given<T extends Record<string, unknown>>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerObjectiveTools(server: McpServer) {
  server.tool(
    "scf_list_security_objectives",
    "List the security objectives register with today's reading of each (read — viewer). The first read adds the platform's proposed starter objectives to an empty register.",
    {
      org_id: orgId,
      include_archived: z.boolean().default(false).describe("Include archived objectives (default false)"),
    },
    { title: "List Security Objectives", readOnlyHint: true },
    async ({ org_id, include_archived }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/security-objectives`, { include_archived }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_security_objective",
    "Get one security objective with its metric in force and today's reading (read — viewer).",
    { org_id: orgId, objective_id: objectiveId },
    { title: "Get Security Objective", readOnlyHint: true },
    async ({ org_id, objective_id }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/security-objectives/${objective_id}`));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_isms_metric",
    "Get one ISMS metric in detail: reading, trend, pace to target, logged results and the breakdown behind a live value (read — viewer).",
    {
      org_id: orgId,
      objective_id: objectiveId,
      breakdown_limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Rows of the live value's breakdown to return, 1–50 (default 10)"),
    },
    { title: "Get ISMS Metric", readOnlyHint: true },
    async ({ org_id, objective_id, breakdown_limit }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/isms-metrics/${objective_id}`, { breakdown_limit }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_isms_measures",
    "List the live measure library with each measure's value today, best matches first when text is given (read — viewer). Pick measure_key for a live metric here.",
    {
      org_id: orgId,
      text: z.string().max(300).optional().describe("Words to match, e.g. 'mfa' or 'phishing'"),
    },
    { title: "List ISMS Measures", readOnlyHint: true },
    async ({ org_id, text: words }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/isms-metrics/measures`, { text: words }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_security_objective",
    "Add a security objective (write — editor). It is always created proposed; an admin confirms it. Pass metric to set its first measure and target.",
    {
      org_id: orgId,
      name: z.string().min(1).max(300).describe("The objective, e.g. 'Phishing click rate stays under 5%'"),
      planned_actions: objectiveFields.planned_actions.optional(),
      resources: objectiveFields.resources.optional(),
      evaluation_method: objectiveFields.evaluation_method.optional(),
      objective_type: objectiveFields.objective_type.optional(),
      owning_team_id: objectiveFields.owning_team_id.optional(),
      owner_user_id: objectiveFields.owner_user_id.optional(),
      due_date: objectiveFields.due_date.optional(),
      review_date: objectiveFields.review_date.optional(),
      iso_clauses: objectiveFields.iso_clauses.optional(),
      metric: z
        .object(metricFields)
        .optional()
        .describe(
          "First metric: kind plus measure_key (live), or unit, direction and frequency (logged), and the target",
        ),
    },
    { title: "Create Security Objective", readOnlyHint: false, destructiveHint: false },
    async (args) => {
      try {
        const client = getClient();
        const body = given({
          name: args.name,
          planned_actions: args.planned_actions,
          resources: args.resources,
          evaluation_method: args.evaluation_method,
          objective_type: args.objective_type,
          owning_team_id: args.owning_team_id,
          owner_user_id: args.owner_user_id,
          due_date: args.due_date,
          review_date: args.review_date,
          iso_clauses: args.iso_clauses,
          metric: args.metric,
        });
        return ok(await client.post(`/organizations/${args.org_id}/security-objectives`, body));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_security_objective",
    "Edit an objective (write — editor; only passed fields change). Once confirmed, changing type or due date, or closing it, takes an admin. Cannot archive or delete.",
    {
      org_id: orgId,
      objective_id: objectiveId,
      name: z.string().min(1).max(300).optional().describe("New wording of the objective"),
      planned_actions: objectiveFields.planned_actions.optional(),
      resources: objectiveFields.resources.optional(),
      evaluation_method: objectiveFields.evaluation_method.optional(),
      objective_type: objectiveFields.objective_type.optional(),
      owning_team_id: objectiveFields.owning_team_id.nullable().optional(),
      owner_user_id: objectiveFields.owner_user_id.nullable().optional(),
      owner_text: z
        .string()
        .max(300)
        .nullable()
        .optional()
        .describe("Owner named in words when not a member; null clears"),
      due_date: objectiveFields.due_date.nullable().optional(),
      review_date: objectiveFields.review_date.nullable().optional(),
      iso_clauses: objectiveFields.iso_clauses.optional(),
      lifecycle_status: z
        .enum(LIFECYCLE)
        .optional()
        .describe(
          "Close a confirmed objective as achieved or missed, or reopen it as active (admin once confirmed; refused while proposed — confirm it first)",
        ),
    },
    { title: "Update Security Objective", readOnlyHint: false, destructiveHint: false },
    async (args) => {
      try {
        // Named fields only: anything else the caller sends (notably `archived`) never reaches the platform.
        const body = given({
          name: args.name,
          planned_actions: args.planned_actions,
          resources: args.resources,
          evaluation_method: args.evaluation_method,
          objective_type: args.objective_type,
          owning_team_id: args.owning_team_id,
          owner_user_id: args.owner_user_id,
          owner_text: args.owner_text,
          due_date: args.due_date,
          review_date: args.review_date,
          iso_clauses: args.iso_clauses,
          lifecycle_status: args.lifecycle_status,
        });
        if (Object.keys(body).length === 0) {
          return errorResult(new Error("Nothing to change: pass at least one field to update"));
        }
        const client = getClient();
        return ok(await client.patch(`/organizations/${args.org_id}/security-objectives/${args.objective_id}`, body));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_objective_metric",
    "Set an objective's measure and target (write — editor while proposed, admin once confirmed). The metric in force is closed and a new version opened; history is kept.",
    { org_id: orgId, objective_id: objectiveId, ...metricFields },
    { title: "Set Objective Metric", readOnlyHint: false, destructiveHint: false },
    async (args) => {
      try {
        const client = getClient();
        const body = given({
          kind: args.kind,
          measure_key: args.measure_key,
          params: args.params,
          name: args.name,
          description: args.description,
          unit: args.unit,
          direction: args.direction,
          target_value: args.target_value,
          warn_value: args.warn_value,
          frequency: args.frequency,
          evaluation_method: args.evaluation_method,
        });
        return ok(
          await client.put(`/organizations/${args.org_id}/security-objectives/${args.objective_id}/metric`, body),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_confirm_security_objective",
    "Confirm a proposed objective so it becomes active (write — ADMIN). Needs a team, a metric, and a target (live, logged) or due date (milestone), set before or passed here.",
    {
      org_id: orgId,
      objective_id: objectiveId,
      owning_team_id: objectiveFields.owning_team_id.optional(),
      target_value: metricFields.target_value,
      warn_value: metricFields.warn_value,
      due_date: objectiveFields.due_date.optional(),
      review_date: objectiveFields.review_date.optional(),
    },
    { title: "Confirm Security Objective", readOnlyHint: false, destructiveHint: false },
    async (args) => {
      try {
        const client = getClient();
        const body = given({
          owning_team_id: args.owning_team_id,
          target_value: args.target_value,
          warn_value: args.warn_value,
          due_date: args.due_date,
          review_date: args.review_date,
        });
        return ok(
          await client.post(`/organizations/${args.org_id}/security-objectives/${args.objective_id}/confirm`, body),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_log_isms_metric_value",
    "Log a result for a logged or milestone metric (write — editor; milestone: 1 done, 0 not), by objective_id or ref (OBJ-09). Results are never changed or removed: a correction is a new entry.",
    {
      org_id: orgId,
      objective_id: objectiveId.optional(),
      ref: z
        .string()
        .regex(/^OBJ-\d{1,6}$/, "Objective ref such as OBJ-09")
        .optional()
        .describe(
          "The objective's ref, e.g. OBJ-09, instead of objective_id — as scf_list_security_objectives shows it. Meant for collectors: an API key repeating the newest value is answered without writing a new result",
        ),
      value: z
        .number()
        .finite()
        .describe(
          "The measured value in the metric's unit (percent 0–100, count ≥ 0); for a milestone 1 = done, 0 = not done",
        ),
      period_start: isoDate(
        "A date in the period the value covers (moved to that period's start); the current period when omitted",
      ).optional(),
      note: text(4000, "Where the value came from, or why it corrects an earlier entry").optional(),
      collector: z
        .string()
        .regex(/^[A-Za-z0-9][A-Za-z0-9 ._:/-]{0,79}$/, "Up to 80 letters, digits, spaces and . _ : / -")
        .optional()
        .describe(
          "Name of the automated collector that measured the value, e.g. 'jumpcloud-patch-report'. Accepted only from an API key caller",
        ),
    },
    { title: "Log ISMS Metric Value", readOnlyHint: false, destructiveHint: false },
    async (args) => {
      try {
        if ((args.objective_id === undefined) === (args.ref === undefined)) {
          return errorResult(new Error("Pass exactly one of objective_id or ref"));
        }
        const client = getClient();
        const body = given({
          value: args.value,
          period_start: args.period_start,
          note: args.note,
          collector: args.collector,
        });
        if (args.ref !== undefined) {
          return ok(await client.post(`/organizations/${args.org_id}/isms-metrics/by-ref/${args.ref}/results`, body));
        }
        return ok(await client.post(`/organizations/${args.org_id}/isms-metrics/${args.objective_id}/results`, body));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_isms_measurement_tasks",
    "This period's measurement tasks (read — viewer): one per logged metric whose value is due, due date first. Derived when read, nothing is stored; log the value with scf_log_isms_metric_value.",
    {
      org_id: orgId,
      assigned_to_me: z.boolean().optional().describe("Only tasks whose reminder goes to the caller (default false)"),
      include_done: z
        .boolean()
        .optional()
        .describe("Also list tasks whose value is already logged this period (default false)"),
    },
    { title: "List ISMS Measurement Tasks", readOnlyHint: true },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/isms-metrics/measurement-tasks`, params));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_record_objective_evaluation",
    "Record that an objective's results were evaluated, with a note (write — editor). Clause 9.1 evidence; the record is kept, not edited.",
    {
      org_id: orgId,
      objective_id: objectiveId,
      note: z.string().min(1).max(4000).describe("What was evaluated, the conclusion, and who took part"),
    },
    { title: "Record Objective Evaluation", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, objective_id, note }) => {
      try {
        const client = getClient();
        return ok(
          await client.post(`/organizations/${org_id}/security-objectives/${objective_id}/evaluation`, { note }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
