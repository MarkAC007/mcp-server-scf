import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Record every client call the handlers make instead of hitting the network.
const calls: Array<{ method: string; path: string; body?: unknown; params?: unknown }> = [];
let nextError: Error | null = null;
let nextGetResponse: unknown = null;
const fakeClient = {
  get: vi.fn(async (path: string, params?: unknown) => {
    if (nextError) throw nextError;
    calls.push({ method: "GET", path, params });
    return nextGetResponse ?? { ok: true };
  }),
  post: vi.fn(async (path: string, body?: unknown, params?: unknown) => {
    calls.push({ method: "POST", path, body, params });
    return { ok: true };
  }),
  patch: vi.fn(async (path: string, body?: unknown) => {
    calls.push({ method: "PATCH", path, body });
    return { ok: true };
  }),
  put: vi.fn(async (path: string, body?: unknown, params?: unknown) => {
    calls.push({ method: "PUT", path, body, params });
    return { ok: true };
  }),
  delete: vi.fn(async (path: string) => {
    calls.push({ method: "DELETE", path });
    return { ok: true };
  }),
};
vi.mock("../src/lib/api-client.js", () => ({ getClient: () => fakeClient }));

import { registerEvidenceTools } from "../src/tools/evidence.js";
import { registerVendorTools } from "../src/tools/vendors.js";
import { registerOrganizationTools } from "../src/tools/organization.js";
import { registerTeamTools } from "../src/tools/teams.js";
import { registerScopedControlTools } from "../src/tools/scoped-controls.js";
import { registerRiskTools } from "../src/tools/risk.js";
import { registerAssuranceTools } from "../src/tools/assurance.js";
import { registerCapabilityTools } from "../src/tools/capabilities.js";
import { registerObjectiveTools } from "../src/tools/objectives.js";
import { registerCatalogTools } from "../src/tools/catalog.js";
import { registerEngagementTools } from "../src/tools/engagements.js";
import { registerEngagementReviewTools } from "../src/tools/engagement-reviews.js";
import { registerDocumentTools } from "../src/tools/documents.js";
import { registerJourneyTools } from "../src/tools/journey.js";
import { readFileSync } from "node:fs";
import { collectExposedTools } from "../src/server.js";

type Handler = (args: Record<string, unknown>) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

/** Register a module against a stub server and return one tool's Zod input shape. */
function shapeOf(register: (s: McpServer) => void, tool: string): Record<string, z.ZodTypeAny> {
  let shape: Record<string, z.ZodTypeAny> | undefined;
  const server = {
    tool: (name: string, _d: string, s: Record<string, z.ZodTypeAny>) => {
      if (name === tool) shape = s;
    },
  };
  register(server as unknown as McpServer);
  if (!shape) throw new Error(`tool ${tool} not registered`);
  return shape;
}

/** Register a module against a stub server and return its handlers by tool name. */
function handlersOf(register: (s: McpServer) => void): Map<string, Handler> {
  const map = new Map<string, Handler>();
  const server = { tool: (name: string, ...rest: unknown[]) => map.set(name, rest[rest.length - 1] as Handler) };
  register(server as unknown as McpServer);
  return map;
}

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  calls.length = 0;
  nextError = null;
});

describe("handlers translate tool arguments into the platform's routes", () => {
  it("scf_list_evidence_tasks maps tool filter names onto the platform's query names", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_list_evidence_tasks")!;
    await h({ org_id: ORG, assignee: ID, status: "completed", overdue_only: true });
    expect(calls[0]).toEqual({
      method: "GET",
      path: "/evidence-tasks",
      params: {
        organization_id: ORG,
        assigned_user_id: ID,
        status_filter: "completed",
        overdue_only: true,
        assigned_to_me: undefined,
        evidence_tracking_id: undefined,
      },
    });
  });

  it("scf_complete_evidence_task sends completion_notes as a query param, not in the path", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_complete_evidence_task")!;
    await h({ task_id: ID, completion_notes: "done & dusted" });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/evidence-tasks/${ID}/complete`,
      body: undefined,
      params: { completion_notes: "done & dusted" },
    });
  });

  it("scf_list_vendor_action_items switches route on vendor_id", async () => {
    const h = handlersOf(registerVendorTools).get("scf_list_vendor_action_items")!;
    await h({ org_id: ORG, vendor_id: ID, status: "open" });
    await h({ org_id: ORG, status: "open" });
    expect(calls[0].path).toBe(`/organizations/${ORG}/vendors/${ID}/action-items`);
    expect(calls[1].path).toBe(`/organizations/${ORG}/vendor-action-items`);
    expect(calls[0].params).toEqual(calls[1].params);
  });

  it("scf_mark_notifications_read needs an explicit target", async () => {
    const h = handlersOf(registerOrganizationTools).get("scf_mark_notifications_read")!;
    const neither = await h({ all: false });
    expect(neither.isError).toBe(true);
    expect(calls).toHaveLength(0);
    await h({ notification_id: ID, all: false });
    await h({ all: true });
    expect(calls.map((c) => c.path)).toEqual([`/notifications/${ID}/read`, "/notifications/read-all"]);
  });

  it("scf_list_team_assignments passes item_ids through as an array for repeated-key encoding", async () => {
    const h = handlersOf(registerTeamTools).get("scf_list_team_assignments")!;
    await h({ org_id: ORG, type: "control", item_ids: [ID, ORG], accountable_only: false });
    expect(calls[0].path).toBe(`/organizations/${ORG}/team-assignments`);
    expect((calls[0].params as Record<string, unknown>).item_ids).toEqual([ID, ORG]);
  });

  it("scf_batch_create_team_assignments posts the body minus org_id", async () => {
    const h = handlersOf(registerTeamTools).get("scf_batch_create_team_assignments")!;
    await h({ org_id: ORG, type: "evidence", team_id: ID, item_ids: [ORG], is_accountable: true });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/team-assignments/batch`,
      body: { type: "evidence", team_id: ID, item_ids: [ORG], is_accountable: true },
      params: undefined,
    });
  });

  it("a client error becomes an errorResult, never a throw", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_get_frequency_health")!;
    nextError = new Error("boom");
    const res = await h({ org_id: ORG });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("boom");
  });
});

describe("evidence assurance: review-queue tier and window verdict tools (#236)", () => {
  it("scf_get_assessment_review_queue defaults tier to file at the schema layer (the platform default)", () => {
    const parsed = z.object(shapeOf(registerEvidenceTools, "scf_get_assessment_review_queue")).parse({ org_id: ORG });
    expect(parsed.tier).toBe("file");
    expect(parsed.status).toBe("awaiting");
  });

  it("scf_get_assessment_review_queue sends tier=window as a query param and passes window entries through", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_get_assessment_review_queue")!;
    nextGetResponse = { items: [{ kind: "window", window_assessment_id: "w1" }], total: 1 };
    try {
      const res = await h({ org_id: ORG, tier: "window", status: "awaiting", limit: 50, offset: 0 });
      expect(res.isError).toBeFalsy();
      expect(JSON.parse(res.content[0].text).items[0].window_assessment_id).toBe("w1");
    } finally {
      nextGetResponse = null;
    }
    expect(calls[0]).toEqual({
      method: "GET",
      path: `/organizations/${ORG}/evidence/assessment/review-queue`,
      params: { tier: "window", status: "awaiting", limit: 50, offset: 0 },
    });
  });

  it("scf_get_assessment_review_queue refuses to present per-file entries as window verdicts (platform ignored tier)", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_get_assessment_review_queue")!;
    nextGetResponse = { items: [{ file_id: "f1", evidence_id: "E-IAM-01" }], total: 1 };
    try {
      const res = await h({ org_id: ORG, tier: "window", status: "awaiting", limit: 50, offset: 0 });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("v1.192.1");
      const file = await h({ org_id: ORG, tier: "file", status: "awaiting", limit: 50, offset: 0 });
      expect(file.isError).toBeFalsy();
    } finally {
      nextGetResponse = null;
    }
  });

  it("scf_review_window_assessment_verdict rejects an empty ao_id at the schema layer", () => {
    const schema = z.object(shapeOf(registerEvidenceTools, "scf_review_window_assessment_verdict"));
    const base = {
      org_id: ORG,
      assessment_id: "8a6c1d8e-3d1a-4c25-9c5c-8f2c8b2d6e11",
      decision: "overridden",
      reason: "x",
    };
    expect(
      schema.safeParse({ ...base, ao_overrides: [{ ao_id: "", human_designation: "gap_identified" }] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...base, ao_overrides: [{ ao_id: "AO-1", human_designation: "gap_identified" }] }).success,
    ).toBe(true);
  });

  it("scf_get_assessment_review_queue passes tier=file through unchanged", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_get_assessment_review_queue")!;
    await h({ org_id: ORG, tier: "file", status: "all", limit: 10, offset: 20 });
    expect(calls[0].params).toEqual({ tier: "file", status: "all", limit: 10, offset: 20 });
  });

  it("scf_review_window_assessment_verdict posts decision, reason and ao_overrides to the verdict route", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_review_window_assessment_verdict")!;
    const ao_overrides = [{ ao_id: "AST-01.1", human_designation: "gap_identified", note: "screenshot is stale" }];
    await h({ org_id: ORG, assessment_id: ID, decision: "overridden", reason: "stale evidence", ao_overrides });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/evidence/window-assessments/${ID}/verdict/review`,
      body: { decision: "overridden", reason: "stale evidence", ao_overrides },
      params: undefined,
    });
  });

  it("scf_get_window_assessment_versions reads the window's version history", async () => {
    const h = handlersOf(registerEvidenceTools).get("scf_get_window_assessment_versions")!;
    await h({ org_id: ORG, assessment_id: ID });
    expect(calls[0]).toEqual({
      method: "GET",
      path: `/organizations/${ORG}/evidence/window-assessments/${ID}/versions`,
      params: undefined,
    });
  });
});

// PIG (scf-controls-platform #1120): routes, methods and bodies for the parity tools. Control IDs are built at
// runtime so no literal catalogue ID appears in the source.
describe("PIG parity tools call the platform routes they document", () => {
  const CTRL = ["GOV", "01"].join("-");
  const RISK = ["R", "AC", "1"].join("-");
  const ORG_RISK = ["R", "ORG", "1"].join("-");
  const scoped = handlersOf(registerScopedControlTools);
  const risk = handlersOf(registerRiskTools);
  const assurance = handlersOf(registerAssuranceTools);

  it("scf_list_scoped_controls passes basis, material and sort to the paginated route", async () => {
    await scoped.get("scf_list_scoped_controls")!({ org_id: ORG, basis: "mcr", material: true, sort: "weighting" });
    expect(calls[0].method).toBe("GET");
    expect(calls[0].path).toBe(`/organizations/${ORG}/scoped-controls-paginated`);
    expect(calls[0].params).toMatchObject({ basis: "mcr", material: true, sort: "weighting" });
  });

  it("scf_set_framework_basis PUTs all three fields, an omitted one as an explicit null", async () => {
    await scoped.get("scf_set_framework_basis")!({ org_id: ORG, framework_id: "gdpr", basis: "mcr" });
    expect(calls[0]).toEqual({
      method: "PUT",
      path: `/organizations/${ORG}/framework-scoping/gdpr/basis`,
      body: { basis: "mcr", obligation_type: null, obligation_source: null },
    });
  });

  it.each([
    ["scf_set_control_basis_override", "basis-override", { basis: "dsr", reason: "contract ended" }],
    ["scf_set_target_maturity", "target-maturity", { level: "L3", reason: "board target" }],
    ["scf_set_control_materiality", "materiality", { material: true, reason: "customer data" }],
    ["scf_set_control_procedure", "procedure-document", { document_id: ID }],
  ])("%s PUTs to /scoped-controls/{scf_id}/%s", async (tool, suffix, body) => {
    await scoped.get(tool)!({ org_id: ORG, scf_id: CTRL, ...body });
    expect(calls[0]).toEqual({
      method: "PUT",
      path: `/organizations/${ORG}/scoped-controls/${CTRL}/${suffix}`,
      body: expect.objectContaining(body),
    });
  });

  it("scf_list_risks sends status as treatment_status and the PIG acceptance filter", async () => {
    await risk.get("scf_list_risks")!({ org_id: ORG, status: "accepted", acceptance_state: "expired", category: "AC" });
    expect(calls[0]).toEqual({
      method: "GET",
      path: `/organizations/${ORG}/risk-assessments`,
      params: {
        treatment_status: "accepted",
        acceptance_state: "expired",
        risk_level: undefined,
        category: "AC",
      },
    });
  });

  it("scf_accept_risk PUTs rationale and expiry to the acceptance route", async () => {
    await risk.get("scf_accept_risk")!({ org_id: ORG, risk_code: RISK, rationale: "cost", expires_on: "2027-03-31" });
    expect(calls[0]).toEqual({
      method: "PUT",
      path: `/organizations/${ORG}/risk-assessments/${RISK}/acceptance`,
      body: { rationale: "cost", expires_on: "2027-03-31" },
    });
  });

  it("scf_add_custom_risk_control sends the optional document_id; scf_update_custom_risk_control PATCHes it", async () => {
    await risk.get("scf_add_custom_risk_control")!({ org_id: ORG, risk_code: ORG_RISK, scf_id: CTRL, document_id: ID });
    await risk.get("scf_update_custom_risk_control")!({
      org_id: ORG,
      risk_code: ORG_RISK,
      scf_id: CTRL,
      document_id: null,
    });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/custom-risks/${ORG_RISK}/controls`,
      body: { scf_id: CTRL, document_id: ID },
      params: undefined,
    });
    expect(calls[1]).toEqual({
      method: "PATCH",
      path: `/organizations/${ORG}/custom-risks/${ORG_RISK}/controls/${CTRL}`,
      body: { document_id: null },
    });
  });

  it("scf_update_custom_risk_control requires document_id but accepts null", () => {
    const schema = z.object(shapeOf(registerRiskTools, "scf_update_custom_risk_control"));
    const base = { org_id: ORG, risk_code: ORG_RISK, scf_id: CTRL };
    expect(schema.safeParse(base).success).toBe(false);
    expect(schema.safeParse({ ...base, document_id: null }).success).toBe(true);
  });

  it.each([
    ["scf_list_deficiencies", { open_only: true, domain: "GOV" }, "GET", "/deficiencies"],
    ["scf_get_deficiency_summary", {}, "GET", "/deficiencies/summary"],
    ["scf_get_deficiency", { deficiency_id: ID }, "GET", `/deficiencies/${ID}`],
    ["scf_list_org_compensating_controls", { risk_code: "R-X" }, "GET", "/compensating-controls"],
    ["scf_get_org_compensating_control", { cc_id: ID }, "GET", `/compensating-controls/${ID}`],
    ["scf_list_control_validations", { state: "overdue" }, "GET", "/control-validations"],
    ["scf_list_posture_snapshots", { limit: 12 }, "GET", "/posture-snapshots"],
    ["scf_get_posture_snapshot", { period: "2026-09" }, "GET", "/posture-snapshots/2026-09"],
    ["scf_take_posture_snapshot", {}, "POST", "/posture-snapshots"],
    ["scf_list_capability_tests", { test_type: "continuity" }, "GET", "/capability-tests"],
    ["scf_get_capability_test", { test_id: ID }, "GET", `/capability-tests/${ID}`],
  ])("%s → %s on the org route", async (tool, args, method, suffix) => {
    await assurance.get(tool)!({ org_id: ORG, ...args });
    expect(calls[0].method).toBe(method);
    expect(calls[0].path).toBe(`/organizations/${ORG}${suffix}`);
  });

  it("scf_create_deficiency posts the body without org_id", async () => {
    await assurance.get("scf_create_deficiency")!({ org_id: ORG, title: "No MFA", scf_id: CTRL, priority: "high" });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/deficiencies`,
      body: { title: "No MFA", scf_id: CTRL, priority: "high" },
      params: undefined,
    });
  });

  it("scf_update_deficiency PATCHes only the fields passed, nulls included", async () => {
    await assurance.get("scf_update_deficiency")!({
      org_id: ORG,
      deficiency_id: ID,
      status: "completed",
      retest_note: "retested, passes",
      due_date: null,
    });
    expect(calls[0]).toEqual({
      method: "PATCH",
      path: `/organizations/${ORG}/deficiencies/${ID}`,
      body: { status: "completed", retest_note: "retested, passes", due_date: null },
    });
  });

  it("org compensating-control create and update hit the org route, not the vendor one", async () => {
    await assurance.get("scf_create_org_compensating_control")!({
      org_id: ORG,
      scf_id: CTRL,
      gap_description: "no SSO",
      compensating_control: "manual review",
      risk_code: RISK,
    });
    await assurance.get("scf_update_org_compensating_control")!({ org_id: ORG, cc_id: ID, risk_code: null });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/compensating-controls`,
      body: { scf_id: CTRL, gap_description: "no SSO", compensating_control: "manual review", risk_code: RISK },
      params: undefined,
    });
    expect(calls[1]).toEqual({
      method: "PATCH",
      path: `/organizations/${ORG}/compensating-controls/${ID}`,
      body: { risk_code: null },
    });
  });

  it("scf_record_control_validation posts the note to the control's validation route", async () => {
    await assurance.get("scf_record_control_validation")!({ org_id: ORG, scf_id: CTRL, note: "sampled 5 joiners" });
    expect(calls[0]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/scoped-controls/${CTRL}/validation`,
      body: { note: "sampled 5 joiners" },
      params: undefined,
    });
  });

  it("capability test create, update and add-finding send their bodies to the right routes", async () => {
    const finding = { title: "Runbook out of date", scf_id: CTRL };
    await assurance.get("scf_create_capability_test")!({
      org_id: ORG,
      test_type: "incident_response",
      title: "Tabletop",
      tested_on: "2026-09-30",
      scenario: "ransomware",
      result: "passed_with_findings",
      outcome: "contained",
      findings: [finding],
    });
    await assurance.get("scf_update_capability_test")!({ org_id: ORG, test_id: ID, result: "failed" });
    await assurance.get("scf_add_capability_test_finding")!({ org_id: ORG, test_id: ID, ...finding });
    expect(calls[0].path).toBe(`/organizations/${ORG}/capability-tests`);
    expect(calls[0].body).toMatchObject({ test_type: "incident_response", findings: [finding] });
    expect(calls[1]).toEqual({
      method: "PATCH",
      path: `/organizations/${ORG}/capability-tests/${ID}`,
      body: { result: "failed" },
    });
    expect(calls[2]).toEqual({
      method: "POST",
      path: `/organizations/${ORG}/capability-tests/${ID}/findings`,
      body: finding,
      params: undefined,
    });
  });

  it("capability-test findings reject unknown fields, as the platform does", () => {
    const schema = z.object(shapeOf(registerAssuranceTools, "scf_create_capability_test"));
    const base = {
      org_id: ORG,
      test_type: "other",
      title: "t",
      tested_on: "2026-09-30",
      scenario: "s",
      result: "failed",
      outcome: "o",
    };
    expect(schema.safeParse({ ...base, findings: [{ title: "f" }] }).success).toBe(true);
    expect(schema.safeParse({ ...base, findings: [{ title: "f", severity: "high" }] }).success).toBe(false);
  });

  it("scf_get_org_settings and scf_update_org_settings use the settings route; an empty update is refused locally", async () => {
    const org = handlersOf(registerOrganizationTools);
    await org.get("scf_get_org_settings")!({ org_id: ORG });
    const empty = await org.get("scf_update_org_settings")!({ org_id: ORG });
    await org.get("scf_update_org_settings")!({ org_id: ORG, maturity_targets: { GOV: "L3" }, business_size: null });
    expect(empty.isError).toBe(true);
    expect(calls).toEqual([
      { method: "GET", path: `/organizations/${ORG}/settings`, params: undefined },
      {
        method: "PATCH",
        path: `/organizations/${ORG}/settings`,
        body: { business_size: null, mission_statement: undefined, maturity_targets: { GOV: "L3" } },
      },
    ]);
  });

  it("scf_list_systems passes the in_scope boundary filter; scf_update_system can mark a system undecided", async () => {
    const cap = handlersOf(registerCapabilityTools);
    await cap.get("scf_list_systems")!({ org_id: ORG, in_scope: "undecided" });
    await cap.get("scf_update_system")!({ org_id: ORG, system_id: ID, in_scope: null, rto_hours: 4 });
    expect(calls[0]).toEqual({
      method: "GET",
      path: `/organizations/${ORG}/systems`,
      params: { vendor_id: undefined, in_scope: "undecided" },
    });
    expect(calls[1]).toEqual({
      method: "PATCH",
      path: `/organizations/${ORG}/systems/${ID}`,
      body: { in_scope: null, rto_hours: 4 },
    });
  });
});

describe("security objectives and ISMS metrics call the routes they document, and never delete", () => {
  const OBJ = `/organizations/${ORG}/security-objectives`;
  const MET = `/organizations/${ORG}/isms-metrics`;
  const h = () => handlersOf(registerObjectiveTools);

  it("the read tools call the register, one objective, one metric's detail and the measure library", async () => {
    const t = h();
    await t.get("scf_list_security_objectives")!({ org_id: ORG, include_archived: false });
    await t.get("scf_get_security_objective")!({ org_id: ORG, objective_id: ID });
    await t.get("scf_get_isms_metric")!({ org_id: ORG, objective_id: ID, breakdown_limit: 25 });
    await t.get("scf_list_isms_measures")!({ org_id: ORG, text: "phishing" });
    expect(calls).toEqual([
      { method: "GET", path: OBJ, params: { include_archived: false } },
      { method: "GET", path: `${OBJ}/${ID}`, params: undefined },
      { method: "GET", path: `${MET}/${ID}`, params: { breakdown_limit: 25 } },
      { method: "GET", path: `${MET}/measures`, params: { text: "phishing" } },
    ]);
  });

  it("scf_create_security_objective posts the named fields with an optional first metric", async () => {
    await h().get("scf_create_security_objective")!({
      org_id: ORG,
      name: "Phishing click rate under 5%",
      objective_type: "maintain",
      iso_clauses: ["6.2", "A.6.3"],
      metric: { kind: "logged", unit: "percent", direction: "at_most", target_value: 5, frequency: "quarterly" },
    });
    expect(calls).toEqual([
      {
        method: "POST",
        path: OBJ,
        body: {
          name: "Phishing click rate under 5%",
          objective_type: "maintain",
          iso_clauses: ["6.2", "A.6.3"],
          metric: { kind: "logged", unit: "percent", direction: "at_most", target_value: 5, frequency: "quarterly" },
        },
        params: undefined,
      },
    ]);
  });

  it("scf_update_security_objective sends only the fields given, never archived, and refuses an empty change", async () => {
    const update = h().get("scf_update_security_objective")!;
    const empty = await update({ org_id: ORG, objective_id: ID });
    const onlyArchived = await update({ org_id: ORG, objective_id: ID, archived: true });
    expect(empty.isError).toBe(true);
    expect(onlyArchived.isError).toBe(true);
    expect(empty.content[0].text).toMatch(/nothing to change/i);
    expect(calls).toHaveLength(0);

    await update({ org_id: ORG, objective_id: ID, lifecycle_status: "achieved", due_date: null, archived: true });
    expect(calls).toEqual([
      { method: "PATCH", path: `${OBJ}/${ID}`, body: { lifecycle_status: "achieved", due_date: null } },
    ]);
    expect(Object.keys(calls[0].body as object)).not.toContain("archived");
  });

  it("the update schema has no archived field, so the consolidated surface cannot carry one either", async () => {
    expect(Object.keys(shapeOf(registerObjectiveTools, "scf_update_security_objective"))).not.toContain("archived");
    const write = collectExposedTools().find((t) => t.name === "scf_objective_write")!;
    expect(Object.keys(write.shape)).not.toContain("archived");
    await write.handler({ method: "update", org_id: ORG, objective_id: ID, name: "Renamed", archived: true });
    expect(calls).toEqual([{ method: "PATCH", path: `${OBJ}/${ID}`, body: { name: "Renamed" } }]);
  });

  it("scf_set_objective_metric puts the metric spec; scf_confirm_security_objective posts what it is given", async () => {
    const t = h();
    await t.get("scf_set_objective_metric")!({
      org_id: ORG,
      objective_id: ID,
      kind: "live",
      measure_key: "mfa_coverage",
      params: { scope: "all" },
      direction: "at_least",
      target_value: 95,
      warn_value: 90,
    });
    await t.get("scf_confirm_security_objective")!({ org_id: ORG, objective_id: ID });
    await t.get("scf_confirm_security_objective")!({
      org_id: ORG,
      objective_id: ID,
      owning_team_id: ORG,
      target_value: 95,
    });
    expect(calls).toEqual([
      {
        method: "PUT",
        path: `${OBJ}/${ID}/metric`,
        body: {
          kind: "live",
          measure_key: "mfa_coverage",
          params: { scope: "all" },
          direction: "at_least",
          target_value: 95,
          warn_value: 90,
        },
      },
      { method: "POST", path: `${OBJ}/${ID}/confirm`, body: {}, params: undefined },
      {
        method: "POST",
        path: `${OBJ}/${ID}/confirm`,
        body: { owning_team_id: ORG, target_value: 95 },
        params: undefined,
      },
    ]);
  });

  it("scf_log_isms_metric_value sends period_start only when given", async () => {
    const log = h().get("scf_log_isms_metric_value")!;
    await log({ org_id: ORG, objective_id: ID, value: 4.2 });
    await log({ org_id: ORG, objective_id: ID, value: 3, period_start: "2026-07-01", note: "Q3 campaign" });
    expect(calls).toEqual([
      { method: "POST", path: `${MET}/${ID}/results`, body: { value: 4.2 }, params: undefined },
      {
        method: "POST",
        path: `${MET}/${ID}/results`,
        body: { value: 3, period_start: "2026-07-01", note: "Q3 campaign" },
        params: undefined,
      },
    ]);
    expect(Object.keys(calls[0].body as object)).not.toContain("period_start");
  });

  it("scf_record_objective_evaluation posts the note", async () => {
    await h().get("scf_record_objective_evaluation")!({ org_id: ORG, objective_id: ID, note: "Reviewed at MRM" });
    expect(calls).toEqual([
      { method: "POST", path: `${OBJ}/${ID}/evaluation`, body: { note: "Reviewed at MRM" }, params: undefined },
    ]);
  });

  it("no objectives tool issues a DELETE, and the module has no client.delete", async () => {
    const t = h();
    const deletesBefore = fakeClient.delete.mock.calls.length;
    expect(t.size).toBe(11);
    const args: Record<string, Record<string, unknown>> = {
      scf_list_security_objectives: { include_archived: true },
      scf_get_security_objective: { objective_id: ID },
      scf_get_isms_metric: { objective_id: ID, breakdown_limit: 10 },
      scf_list_isms_measures: {},
      scf_create_security_objective: { name: "x" },
      scf_update_security_objective: { objective_id: ID, name: "y", archived: true },
      scf_set_objective_metric: { objective_id: ID, kind: "milestone" },
      scf_confirm_security_objective: { objective_id: ID },
      scf_log_isms_metric_value: { objective_id: ID, value: 1 },
      scf_record_objective_evaluation: { objective_id: ID, note: "n" },
      scf_list_isms_measurement_tasks: {},
    };
    expect([...t.keys()].sort()).toEqual(Object.keys(args).sort());
    for (const [name, handler] of t) {
      const res = await handler({ org_id: ORG, ...args[name] });
      expect(res.isError, name).toBeFalsy();
    }
    expect(calls).toHaveLength(11);
    expect(fakeClient.delete.mock.calls.length).toBe(deletesBefore);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    const src = readFileSync(new URL("../src/tools/objectives.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/\.delete\b/);
  });
});

describe("platform alignment 2026-11: new routes and new fields on existing tools", () => {
  const ENG = `/organizations/${ORG}/engagements/${ID}`;
  const EV = "E-GOV-01";
  const reviews = () => handlersOf(registerEngagementReviewTools);
  const parses = (register: (s: McpServer) => void, tool: string, args: Record<string, unknown>) =>
    z.object(shapeOf(register, tool)).safeParse(args).success;

  it("the risk and threat catalogs call the catalog routes", async () => {
    const t = handlersOf(registerCatalogTools);
    await t.get("scf_list_catalog_risks")!({});
    await t.get("scf_list_catalog_threats")!({ include_deprecated: true });
    expect(calls).toEqual([
      { method: "GET", path: "/catalog/risks", params: { include_deprecated: undefined } },
      { method: "GET", path: "/catalog/threats", params: { include_deprecated: true } },
    ]);
  });

  it("scf_create_risk posts risk_code and the platform's fields, and its schema has no title", async () => {
    await handlersOf(registerRiskTools).get("scf_create_risk")!({
      org_id: ORG,
      risk_code: "R-AC-1",
      likelihood: 3,
      impact: 4,
      owner_user_id: ID,
      next_review_date: "2027-01-31",
    });
    expect(calls).toEqual([
      {
        method: "POST",
        path: `/organizations/${ORG}/risk-assessments`,
        body: { risk_code: "R-AC-1", likelihood: 3, impact: 4, owner_user_id: ID, next_review_date: "2027-01-31" },
        params: undefined,
      },
    ]);
    const shape = shapeOf(registerRiskTools, "scf_create_risk");
    expect(Object.keys(shape).sort()).toEqual(
      [
        "org_id",
        "risk_code",
        "likelihood",
        "impact",
        "residual_likelihood",
        "residual_impact",
        "treatment_status",
        "treatment_plan",
        "treatment_due_date",
        "next_review_date",
        "owner_user_id",
        "notes",
      ].sort(),
    );
    expect(parses(registerRiskTools, "scf_create_risk", { org_id: ORG, risk_code: "R-ORG-12" })).toBe(true);
    expect(parses(registerRiskTools, "scf_create_risk", { org_id: ORG })).toBe(false);
    expect(parses(registerRiskTools, "scf_create_risk", { org_id: ORG, risk_code: "AC-1" })).toBe(false);
  });

  it("the evidence review read tools call the board, card, events, people, dashboard and comment routes", async () => {
    const t = reviews();
    const base = { org_id: ORG, engagement_id: ID };
    await t.get("scf_list_evidence_reviews")!({
      ...base,
      framework: "iso_27001_2022",
      status: "submitted",
      mine: true,
    });
    await t.get("scf_get_evidence_review")!({ ...base, evidence_id: EV });
    await t.get("scf_list_evidence_review_events")!({ ...base, evidence_id: EV });
    await t.get("scf_list_review_people")!(base);
    await t.get("scf_get_review_dashboard")!({ ...base, framework: "iso_27001_2022" });
    await t.get("scf_list_evidence_review_comments")!({ ...base, evidence_id: EV, visibility: "internal" });
    await t.get("scf_count_evidence_review_comments")!({ ...base, evidence_id: EV });
    expect(calls).toEqual([
      {
        method: "GET",
        path: `${ENG}/evidence-reviews`,
        params: { framework: "iso_27001_2022", status: "submitted", mine: true },
      },
      { method: "GET", path: `${ENG}/evidence-reviews/${EV}`, params: { framework: undefined } },
      { method: "GET", path: `${ENG}/evidence-reviews/${EV}/events`, params: undefined },
      { method: "GET", path: `${ENG}/review-people`, params: undefined },
      { method: "GET", path: `${ENG}/review-dashboard`, params: { framework: "iso_27001_2022" } },
      { method: "GET", path: `${ENG}/evidence-reviews/${EV}/comments`, params: { visibility: "internal" } },
      { method: "GET", path: `${ENG}/evidence-reviews/${EV}/comments/counts`, params: undefined },
    ]);
  });

  it("scf_set_evidence_review_status posts only the fields given, with framework as a query param", async () => {
    const set = reviews().get("scf_set_evidence_review_status")!;
    await set({ org_id: ORG, engagement_id: ID, evidence_id: EV, to_status: "in_progress" });
    await set({
      org_id: ORG,
      engagement_id: ID,
      evidence_id: EV,
      framework: "soc2",
      to_status: "submitted",
      from_status: "action_required",
      note: "Policy re-approved",
      artifact_file_ids: [ID],
    });
    expect(calls).toEqual([
      {
        method: "POST",
        path: `${ENG}/evidence-reviews/${EV}/status`,
        body: { to_status: "in_progress" },
        params: { framework: undefined },
      },
      {
        method: "POST",
        path: `${ENG}/evidence-reviews/${EV}/status`,
        body: {
          to_status: "submitted",
          from_status: "action_required",
          note: "Policy re-approved",
          artifact_file_ids: [ID],
        },
        params: { framework: "soc2" },
      },
    ]);
    const args = { org_id: ORG, engagement_id: ID, evidence_id: EV };
    expect(
      parses(registerEngagementReviewTools, "scf_set_evidence_review_status", { ...args, to_status: "done" }),
    ).toBe(false);
    expect(parses(registerEngagementReviewTools, "scf_set_evidence_review_status", args)).toBe(false);
  });

  it("scf_assign_evidence_reviewer puts user_id, and null clears", async () => {
    const assign = reviews().get("scf_assign_evidence_reviewer")!;
    await assign({ org_id: ORG, engagement_id: ID, evidence_id: EV, user_id: ID });
    await assign({ org_id: ORG, engagement_id: ID, evidence_id: EV, user_id: null });
    expect(calls.map((c) => [c.method, c.path, c.body])).toEqual([
      ["PUT", `${ENG}/evidence-reviews/${EV}/reviewer`, { user_id: ID }],
      ["PUT", `${ENG}/evidence-reviews/${EV}/reviewer`, { user_id: null }],
    ]);
    const args = { org_id: ORG, engagement_id: ID, evidence_id: EV };
    expect(parses(registerEngagementReviewTools, "scf_assign_evidence_reviewer", { ...args, user_id: null })).toBe(
      true,
    );
    expect(parses(registerEngagementReviewTools, "scf_assign_evidence_reviewer", args)).toBe(false);
  });

  it("scf_create_evidence_review_comment posts content and only the optional fields given", async () => {
    const comment = reviews().get("scf_create_evidence_review_comment")!;
    await comment({ org_id: ORG, engagement_id: ID, evidence_id: EV, content: "Please attach the signed copy" });
    await comment({
      org_id: ORG,
      engagement_id: ID,
      evidence_id: EV,
      content: "Owner is on leave",
      visibility: "internal",
      parent_comment_id: ID,
      mentions: [ORG],
    });
    expect(calls.map((c) => c.body)).toEqual([
      { content: "Please attach the signed copy" },
      { content: "Owner is on leave", visibility: "internal", parent_comment_id: ID, mentions: [ORG] },
    ]);
    expect(calls.every((c) => c.method === "POST" && c.path === `${ENG}/evidence-reviews/${EV}/comments`)).toBe(true);
    expect(
      parses(registerEngagementReviewTools, "scf_create_evidence_review_comment", {
        org_id: ORG,
        engagement_id: ID,
        evidence_id: EV,
        content: "",
      }),
    ).toBe(false);
  });

  it("an evidence id is one path segment: a slash cannot reach another route", () => {
    const base = { org_id: ORG, engagement_id: ID, to_status: "accepted" };
    for (const evidence_id of ["E-GOV-01/comments", "../other", "E-GOV-01?x=1", "a b", ""]) {
      expect(parses(registerEngagementReviewTools, "scf_set_evidence_review_status", { ...base, evidence_id })).toBe(
        false,
      );
    }
    expect(
      parses(registerEngagementReviewTools, "scf_set_evidence_review_status", { ...base, evidence_id: "E-GOV-01" }),
    ).toBe(true);
  });

  it("the evidence review module has ten tools and no delete", () => {
    expect(reviews().size).toBe(10);
    const src = readFileSync(new URL("../src/tools/engagement-reviews.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/\.delete\b/);
    expect([...reviews().keys()].some((name) => /delete|remove/.test(name))).toBe(false);
  });

  it("scf_list_org_auditors reads the auditor list; scf_add_engagement_auditor takes exactly one of user_id or org_auditor_id", async () => {
    const t = handlersOf(registerEngagementTools);
    await t.get("scf_list_org_auditors")!({ org_id: ORG });
    const add = t.get("scf_add_engagement_auditor")!;
    await add({ org_id: ORG, engagement_id: ID, user_id: ORG });
    await add({ org_id: ORG, engagement_id: ID, org_auditor_id: ID, kind: "external" });
    await add({ org_id: ORG, engagement_id: ID, user_id: ORG, kind: "internal" });
    expect(calls).toEqual([
      { method: "GET", path: `/organizations/${ORG}/auditors`, params: undefined },
      { method: "POST", path: `${ENG}/auditors`, body: { user_id: ORG }, params: undefined },
      { method: "POST", path: `${ENG}/auditors`, body: { auditor_id: ID, kind: "external" }, params: undefined },
      { method: "POST", path: `${ENG}/auditors`, body: { user_id: ORG, kind: "internal" }, params: undefined },
    ]);
    calls.length = 0;
    expect((await add({ org_id: ORG, engagement_id: ID })).isError).toBe(true);
    expect((await add({ org_id: ORG, engagement_id: ID, user_id: ORG, org_auditor_id: ID })).isError).toBe(true);
    expect((await add({ org_id: ORG, engagement_id: ID, org_auditor_id: ID, kind: "internal" })).isError).toBe(true);
    expect(Object.keys(shapeOf(registerEngagementTools, "scf_add_engagement_auditor"))).not.toContain("auditor_id");
    expect(calls).toHaveLength(0);
  });

  it("engagement queries carry evidence_id, and a new query has exactly one target", async () => {
    const t = handlersOf(registerEngagementTools);
    await t.get("scf_list_engagement_queries")!({ org_id: ORG, engagement_id: ID, evidence_id: EV });
    const create = t.get("scf_create_engagement_query")!;
    await create({ org_id: ORG, engagement_id: ID, evidence_id: EV, title: "Date?", body: "Which period?" });
    await create({ org_id: ORG, engagement_id: ID, scf_id: "GOV-01", title: "Owner?", body: "Who owns it?" });
    expect(calls).toEqual([
      { method: "GET", path: `${ENG}/queries`, params: { evidence_id: EV } },
      {
        method: "POST",
        path: `${ENG}/queries`,
        body: { evidence_id: EV, title: "Date?", body: "Which period?" },
        params: undefined,
      },
      {
        method: "POST",
        path: `${ENG}/queries`,
        body: { scf_id: "GOV-01", title: "Owner?", body: "Who owns it?" },
        params: undefined,
      },
    ]);
    calls.length = 0;
    expect((await create({ org_id: ORG, engagement_id: ID, title: "t", body: "b" })).isError).toBe(true);
    expect(
      (await create({ org_id: ORG, engagement_id: ID, scf_id: "GOV-01", evidence_id: EV, title: "t", body: "b" }))
        .isError,
    ).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("the document structure tools and the ISMS profile call their routes", async () => {
    const t = handlersOf(registerDocumentTools);
    const DOC = `/organizations/${ORG}/documents`;
    await t.get("scf_list_document_scopes")!({ org_id: ORG });
    await t.get("scf_get_document_map")!({ org_id: ORG });
    await t.get("scf_preview_document_profile")!({ org_id: ORG, profile: "topics" });
    await t.get("scf_update_document_settings")!({ org_id: ORG, document_profile: "topics" });
    await t.get("scf_get_isms_profile")!({ org_id: ORG });
    await t.get("scf_update_isms_profile_section")!({
      org_id: ORG,
      section: "interested_parties",
      data: [{ id: "abc123", party: "Customers", kind: "external" }],
    });
    await t.get("scf_update_isms_profile_section")!({ org_id: ORG, section: "scope", data: { boundaries: "UK" } });
    expect(calls).toEqual([
      { method: "GET", path: `${DOC}/scopes`, params: undefined },
      { method: "GET", path: `${DOC}/map`, params: undefined },
      { method: "GET", path: `${DOC}/profile-preview`, params: { profile: "topics" } },
      { method: "PUT", path: `${DOC}/settings`, body: { document_profile: "topics" }, params: undefined },
      { method: "GET", path: `/organizations/${ORG}/isms-profile`, params: undefined },
      {
        method: "PUT",
        path: `/organizations/${ORG}/isms-profile/interested_parties`,
        body: { data: [{ id: "abc123", party: "Customers", kind: "external" }] },
        params: undefined,
      },
      {
        method: "PUT",
        path: `/organizations/${ORG}/isms-profile/scope`,
        body: { data: { boundaries: "UK" } },
        params: undefined,
      },
    ]);
    const save = t.get("scf_update_isms_profile_section")!;
    expect(
      parses(registerDocumentTools, "scf_update_isms_profile_section", {
        org_id: ORG,
        section: "objectives",
        data: [],
      }),
    ).toBe(false);
    // The platform reads an empty list for scope as an empty object: the tool refuses the wrong shape itself.
    calls.length = 0;
    expect((await save({ org_id: ORG, section: "scope", data: [] })).isError).toBe(true);
    expect((await save({ org_id: ORG, section: "scope", data: [{ boundaries: "UK" }] })).isError).toBe(true);
    expect((await save({ org_id: ORG, section: "context_issues", data: { issue: "x" } })).isError).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("measurement tasks are read; a value is logged by ref with a collector, by exactly one address", async () => {
    const t = handlersOf(registerObjectiveTools);
    const MET = `/organizations/${ORG}/isms-metrics`;
    await t.get("scf_list_isms_measurement_tasks")!({ org_id: ORG, assigned_to_me: true });
    const log = t.get("scf_log_isms_metric_value")!;
    await log({ org_id: ORG, ref: "OBJ-09", value: 97, collector: "jumpcloud-patch-report" });
    expect(calls).toEqual([
      { method: "GET", path: `${MET}/measurement-tasks`, params: { assigned_to_me: true } },
      {
        method: "POST",
        path: `${MET}/by-ref/OBJ-09/results`,
        body: { value: 97, collector: "jumpcloud-patch-report" },
        params: undefined,
      },
    ]);
    calls.length = 0;
    expect((await log({ org_id: ORG, value: 1 })).isError).toBe(true);
    expect((await log({ org_id: ORG, objective_id: ID, ref: "OBJ-09", value: 1 })).isError).toBe(true);
    expect(calls).toHaveLength(0);
    expect(parses(registerObjectiveTools, "scf_log_isms_metric_value", { org_id: ORG, ref: "OBJ-9/x", value: 1 })).toBe(
      false,
    );
    expect(
      parses(registerObjectiveTools, "scf_log_isms_metric_value", {
        org_id: ORG,
        ref: "OBJ-9",
        value: 1,
        collector: "",
      }),
    ).toBe(false);
  });

  it("scf_update_org_settings sends the reminder days and the task-generation switch", async () => {
    const update = handlersOf(registerOrganizationTools).get("scf_update_org_settings")!;
    await update({ org_id: ORG, isms_measurement_reminder_days: 21, auto_task_generation_enabled: false });
    expect(calls).toEqual([
      {
        method: "PATCH",
        path: `/organizations/${ORG}/settings`,
        body: { isms_measurement_reminder_days: 21, auto_task_generation_enabled: false },
      },
    ]);
    expect(
      parses(registerOrganizationTools, "scf_update_org_settings", { org_id: ORG, isms_measurement_reminder_days: 0 }),
    ).toBe(false);
  });

  it("unscope, deficiency and journey import carry their new fields", async () => {
    await handlersOf(registerScopedControlTools).get("scf_bulk_unscope_framework")!({
      org_id: ORG,
      frameworks: ["iso_27017_2015"],
      orphan_evidence_action: "untrack",
    });
    await handlersOf(registerAssuranceTools).get("scf_create_deficiency")!({
      org_id: ORG,
      title: "Patch SLA missed",
      source: "security_objective",
      source_ref: ID,
    });
    await handlersOf(registerJourneyTools).get("scf_import_journey")!({
      org_id: ORG,
      template_key: "compliancegenie-default",
      activate: false,
      replace_attested: true,
    });
    expect(calls).toEqual([
      {
        method: "POST",
        path: `/organizations/${ORG}/scoped-controls/bulk-unscope-framework`,
        body: { frameworks: ["iso_27017_2015"], removal_reason: undefined, orphan_evidence_action: "untrack" },
        params: undefined,
      },
      {
        method: "POST",
        path: `/organizations/${ORG}/deficiencies`,
        body: { title: "Patch SLA missed", source: "security_objective", source_ref: ID },
        params: undefined,
      },
      {
        method: "POST",
        path: `/organizations/${ORG}/journey/import`,
        body: { template_key: "compliancegenie-default", activate: false, replace_attested: true },
        params: undefined,
      },
    ]);
    expect(
      parses(registerScopedControlTools, "scf_bulk_unscope_framework", {
        org_id: ORG,
        frameworks: ["x"],
        orphan_evidence_action: "delete",
      }),
    ).toBe(false);
    expect(parses(registerAssuranceTools, "scf_create_deficiency", { org_id: ORG, title: "t", source: "audit" })).toBe(
      false,
    );
  });
});
