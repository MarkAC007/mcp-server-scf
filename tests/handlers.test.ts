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
