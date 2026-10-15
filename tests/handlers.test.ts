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
  put: vi.fn(async (path: string, body?: unknown) => {
    calls.push({ method: "PUT", path, body });
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
