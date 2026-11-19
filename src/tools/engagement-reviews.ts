import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

// Engagement evidence review: the board an auditor works through during an engagement.
// A card is one evidence object (SCF ERL id) mapped to the engagement's in-scope controls and,
// through them, to the clauses of one of the engagement's frameworks. Columns are review stages.
// Shapes mirror the platform's backend/api/engagement_evidence_reviews.py and engagement_comments.py.
// The platform's comment delete and the signed artifact link are not wrapped (docs/tool-scope.md).

const ORG_ID = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");
const ENGAGEMENT_ID = z.string().uuid().describe("Audit engagement UUID — obtain from scf_list_engagements");
const EVIDENCE_ID = z
  .string()
  .regex(/^[^/\\?#\s]+$/, "One id, no slashes")
  .describe("Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews");
const FRAMEWORK = z
  .string()
  .optional()
  .describe(
    "One of the engagement's frameworks (see scf_get_engagement); the engagement's first framework when omitted",
  );

export const REVIEW_STATUSES = ["open", "in_progress", "action_required", "submitted", "accepted"] as const;
export const REVIEW_AI_VERDICTS = ["sufficient", "partial", "insufficient", "not_assessed"] as const;
export const COMMENT_VISIBILITIES = ["shared", "internal"] as const;

/** Drop undefined values so only what the caller gave reaches the platform. */
function given<T extends Record<string, unknown>>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerEngagementReviewTools(server: McpServer) {
  server.tool(
    "scf_list_evidence_reviews",
    "The evidence review board for one framework of an engagement (read — org member or active auditor): cards with status, AI verdict and allowed moves, controls with no evidence, filter options.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      framework: FRAMEWORK,
      status: z
        .enum(REVIEW_STATUSES)
        .optional()
        .describe(`Filter by review status: ${REVIEW_STATUSES.join(", ")}`),
      clause: z
        .string()
        .optional()
        .describe("Filter to one clause of the framework, as the board's filter options list it"),
      scf_id: z.string().optional().describe("Filter to cards mapped to one SCF control (DOMAIN-NN)"),
      ai_verdict: z
        .enum(REVIEW_AI_VERDICTS)
        .optional()
        .describe(`Filter by the card's worst in-window AI verdict: ${REVIEW_AI_VERDICTS.join(", ")}`),
      has_open_queries: z
        .boolean()
        .optional()
        .describe("true = only cards with an open query; false = only cards without"),
      reviewer: z
        .string()
        .optional()
        .describe("Reviewer user UUID (obtain from scf_list_review_people), or 'none' for unassigned cards"),
      search: z.string().optional().describe("Free-text match on the card"),
      mine: z.boolean().optional().describe("true = only cards assigned to the caller"),
    },
    { title: "List Evidence Reviews", readOnlyHint: true },
    async ({ org_id, engagement_id, ...params }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews`, params));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_evidence_review",
    "One evidence review card (read — org member or active auditor): artifacts, the last decision, the catalog text, mapped controls and clauses, and allowed_transitions for the caller.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
      framework: FRAMEWORK,
    },
    { title: "Get Evidence Review", readOnlyHint: true },
    async ({ org_id, engagement_id, evidence_id, framework }) => {
      try {
        const client = getClient();
        return ok(
          await client.get(`/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}`, {
            framework,
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_evidence_review_events",
    "The history of one evidence review card, oldest first (read — org member or active auditor): each status move and reviewer assignment with who made it, when, and the note.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
    },
    { title: "List Evidence Review Events", readOnlyHint: true },
    async ({ org_id, engagement_id, evidence_id }) => {
      try {
        const client = getClient();
        return ok(
          await client.get(
            `/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}/events`,
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_review_people",
    "People with access to one engagement (read — org member or active auditor), without emails: auditors and members. The source of user ids for reviewer assignment, filters and mentions.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
    },
    { title: "List Review People", readOnlyHint: true },
    async ({ org_id, engagement_id }) => {
      try {
        const client = getClient();
        return ok(await client.get(`/organizations/${org_id}/engagements/${engagement_id}/review-people`));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_review_dashboard",
    "Roll-up of the evidence review for one framework (read — org member or active auditor): evidence, controls and clauses by review status, action required, open queries, timeline.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      framework: FRAMEWORK,
    },
    { title: "Get Review Dashboard", readOnlyHint: true },
    async ({ org_id, engagement_id, framework }) => {
      try {
        const client = getClient();
        return ok(
          await client.get(`/organizations/${org_id}/engagements/${engagement_id}/review-dashboard`, { framework }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_evidence_review_status",
    "Move an evidence review card (write). Auditors make every move except action_required→submitted, which an organization editor or admin makes. Unlisted move 409, wrong side 403, missing note 422.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
      framework: FRAMEWORK,
      to_status: z
        .enum(REVIEW_STATUSES)
        .describe(
          "Status to move the card to; the card's allowed_transitions lists what the caller may do now. Auditor: open→in_progress, in_progress→action_required (note), in_progress→accepted, submitted→in_progress, submitted→action_required (note), submitted→accepted, accepted→in_progress (note). Organization editor or admin: action_required→submitted (note, plus artifact_file_ids or no_artifact_reason). An internal auditor cannot accept evidence they own, are accountable for, or responded on (403)",
        ),
      from_status: z
        .enum(REVIEW_STATUSES)
        .optional()
        .describe("The status you last read; when given, the move is refused (409) if the card has moved since"),
      note: z
        .string()
        .optional()
        .describe(
          "Why: what action is needed (to action_required), the organization's response (to submitted), or the reason for reopening accepted evidence",
        ),
      artifact_file_ids: z
        .array(z.string().uuid())
        .optional()
        .describe(
          "For action_required→submitted: evidence file UUIDs of this evidence object that answer the request — obtain from scf_list_evidence_files",
        ),
      no_artifact_reason: z
        .string()
        .optional()
        .describe("For action_required→submitted with no file to link: why there is none"),
    },
    { title: "Set Evidence Review Status", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, evidence_id, framework, ...fields }) => {
      try {
        const client = getClient();
        return ok(
          await client.post(
            `/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}/status`,
            given(fields),
            { framework },
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_assign_evidence_reviewer",
    "Assign, or clear, the auditor reviewing one evidence card (write — an engagement auditor or an organization admin). The reviewer must hold an active auditor grant on this engagement.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
      framework: FRAMEWORK,
      user_id: z
        .string()
        .uuid()
        .nullable()
        .describe("Auditor user UUID — obtain from scf_list_review_people; null clears the assignment"),
    },
    { title: "Assign Evidence Reviewer", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, evidence_id, framework, user_id }) => {
      try {
        const client = getClient();
        return ok(
          await client.put(
            `/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}/reviewer`,
            { user_id },
            { framework },
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_evidence_review_comments",
    "The comment thread on one evidence review card, oldest first (read — org member or active auditor). shared is seen by all with engagement access; an auditor asking for internal gets 404.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
      visibility: z
        .enum(COMMENT_VISIBILITIES)
        .optional()
        .describe("Which thread: shared (default) or internal (organization members only)"),
    },
    { title: "List Evidence Review Comments", readOnlyHint: true },
    async ({ org_id, engagement_id, evidence_id, visibility }) => {
      try {
        const client = getClient();
        return ok(
          await client.get(
            `/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}/comments`,
            { visibility },
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_evidence_review_comment",
    "Post a comment on one evidence review card (write — org member or active auditor). A reply takes its parent's visibility; an auditor cannot post internal notes. No edit or delete here.",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
      content: z.string().min(1).describe("Comment text"),
      visibility: z
        .enum(COMMENT_VISIBILITIES)
        .optional()
        .describe("shared (default: everyone with engagement access) or internal (organization members only)"),
      parent_comment_id: z
        .string()
        .uuid()
        .optional()
        .describe("Comment UUID to reply to — obtain from scf_list_evidence_review_comments"),
      mentions: z
        .array(z.string().uuid())
        .optional()
        .describe("User UUIDs to notify — obtain from scf_list_review_people"),
    },
    { title: "Create Evidence Review Comment", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, engagement_id, evidence_id, ...fields }) => {
      try {
        const client = getClient();
        return ok(
          await client.post(
            `/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}/comments`,
            given(fields),
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_count_evidence_review_comments",
    "Comment counts for one evidence review card (read — org member or active auditor): {shared: n}, plus internal only for a caller who may see internal notes (absent for an auditor).",
    {
      org_id: ORG_ID,
      engagement_id: ENGAGEMENT_ID,
      evidence_id: EVIDENCE_ID,
    },
    { title: "Count Evidence Review Comments", readOnlyHint: true },
    async ({ org_id, engagement_id, evidence_id }) => {
      try {
        const client = getClient();
        return ok(
          await client.get(
            `/organizations/${org_id}/engagements/${engagement_id}/evidence-reviews/${evidence_id}/comments/counts`,
          ),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
