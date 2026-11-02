import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

// Record every platform call the original handlers make instead of hitting the network.
const calls: Array<{ method: string; path: string; body?: unknown; params?: unknown }> = [];
const fakeClient = {
  get: vi.fn(async (path: string, params?: unknown) => {
    calls.push({ method: "GET", path, params });
    return { ok: true };
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

import plan from "../src/consolidation/plan.json";
import {
  ToolCollector,
  buildExposedTools,
  type CapturedTool,
  type Plan,
  type ToolHandler,
} from "../src/consolidation/consolidate.js";
import { LOAD_TOOLS_NAME, loadAllFromEnv } from "../src/consolidation/registry.js";
import { collectExposedTools, createServer } from "../src/server.js";
import { registerVendorTools } from "../src/tools/vendors.js";

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const PLAN = plan as Plan;

beforeEach(() => {
  calls.length = 0;
});

const ok = (text = "ok"): ReturnType<ToolHandler> => Promise.resolve({ content: [{ type: "text", text }] });

function captured(
  name: string,
  shape: Record<string, z.ZodType>,
  readOnly = true,
  handler?: ToolHandler,
): CapturedTool {
  return {
    name,
    description: `${name} description`,
    shape,
    annotations: { title: name, readOnlyHint: readOnly },
    handler: handler ?? (async (args) => ok(JSON.stringify(args))),
  };
}

describe("the plan and the code agree", () => {
  it("places every original tool exactly once and exposes the planned surface", () => {
    const exposed = collectExposedTools();
    const originals = new Set(exposed.flatMap((t) => Object.values(t.methods)));
    expect(originals.size).toBe(225);
    expect(exposed.map((t) => t.name).sort()).toEqual(Object.keys(PLAN.tools).sort());
    expect(exposed).toHaveLength(41);
  });

  it("every exposed tool is scf_-prefixed with a description of at most 200 characters", () => {
    for (const t of collectExposedTools()) {
      expect(t.name).toMatch(/^scf_[a-z][a-z0-9_]*$/);
      expect(t.description.length, t.name).toBeLessThanOrEqual(200);
      expect(t.annotations.title).toBeTruthy();
    }
  });

  it("every core group exists and every group has at least one tool", () => {
    const exposed = collectExposedTools();
    for (const g of PLAN.core_groups) expect(PLAN.groups[g], g).toBeTruthy();
    for (const g of Object.keys(PLAN.groups))
      expect(
        exposed.some((t) => t.group === g),
        g,
      ).toBe(true);
  });

  it("a read tool is read-only only when every method is; a write tool is destructive when any method is", () => {
    const byName = new Map(collectExposedTools().map((t) => [t.name, t]));
    expect(byName.get("scf_vendor_read")!.annotations.readOnlyHint).toBe(true);
    expect(byName.get("scf_vendor_read")!.annotations.destructiveHint).toBeUndefined();
    expect(byName.get("scf_vendor_write")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(byName.get("scf_vendor_record_write")!.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });
    expect(byName.get("scf_evidence_file_write")!.annotations.destructiveHint).toBe(true);
  });

  it("rejects a plan that leaves a tool out, places one twice, or names one that does not exist", () => {
    const tools = [captured("scf_a", {}), captured("scf_b", {})];
    const base = { core_groups: ["g"], groups: { g: "group g" } };
    expect(() =>
      buildExposedTools(tools, { ...base, tools: { scf_a: { group: "g", methods: { a: "scf_a" } } } }),
    ).toThrow(/not placed: scf_b/);
    expect(() =>
      buildExposedTools(tools, {
        ...base,
        tools: {
          scf_x_read: { group: "g", description: "x", methods: { a: "scf_a", b: "scf_b" } },
          scf_a: { group: "g", methods: { a: "scf_a" } },
        },
      }),
    ).toThrow(/placed in both/);
    expect(() =>
      buildExposedTools(tools, {
        ...base,
        tools: { scf_x_read: { group: "g", description: "x", methods: { a: "scf_a", b: "scf_b", c: "scf_c" } } },
      }),
    ).toThrow(/unknown tool scf_c/);
  });
});

describe("merged tool schemas", () => {
  const tools = [
    captured("scf_list_things", {
      org_id: z.string().uuid().describe("Organization UUID"),
      search: z.string().optional().describe("Free-text filter"),
      limit: z.number().int().default(50).describe("Page size"),
    }),
    captured("scf_get_thing", {
      org_id: z.string().uuid().describe("Organization UUID"),
      thing_id: z.string().uuid().describe("Thing UUID"),
      status: z.enum(["open", "closed"]).optional().describe("Status filter"),
    }),
    captured("scf_set_thing_status", {
      org_id: z.string().uuid().describe("Organization UUID"),
      thing_id: z.string().uuid().describe("Thing UUID"),
      status: z.enum(["open", "closed", "archived"]).describe("New status"),
    }),
  ];
  const [merged] = buildExposedTools(tools, {
    core_groups: ["g"],
    groups: { g: "g" },
    tools: {
      scf_thing_read: {
        group: "g",
        description: "Things.",
        methods: { list: "scf_list_things", get: "scf_get_thing", set_status: "scf_set_thing_status" },
      },
    },
  });
  const json = z.toJSONSchema(z.object(merged.shape)) as {
    properties: Record<string, Record<string, unknown>>;
    required: string[];
  };

  it("adds a method enum whose description carries each original description", () => {
    expect(json.properties.method.enum).toEqual(["list", "get", "set_status"]);
    expect(json.properties.method.description).toContain("list: scf_list_things description");
    expect(json.properties.method.description).toContain("set_status: scf_set_thing_status description");
  });

  it("keeps a parameter required only when every method requires it", () => {
    expect(json.required).toEqual(["method", "org_id"]);
    expect(json.properties.org_id.description).toBe("Organization UUID");
  });

  it("says which methods use a parameter that not all of them take, and strips defaults", () => {
    expect(json.properties.search.description).toBe("Free-text filter Used by: list.");
    expect(json.properties.thing_id.description).toBe("Thing UUID Used by: get, set_status.");
    expect(json.properties.limit.default).toBeUndefined();
  });

  it("unions a parameter whose type differs between methods and labels each description", () => {
    expect(json.properties.status.anyOf ?? json.properties.status.oneOf).toBeTruthy();
    expect(json.properties.status.description).toBe(
      "Status filter [get] | New status [set_status] Used by: get, set_status.",
    );
  });
});

describe("merged tool dispatch", () => {
  it("routes a call to the chosen method's handler with that method's own validation and defaults", async () => {
    const byName = new Map(collectExposedTools().map((t) => [t.name, t]));
    const read = byName.get("scf_vendor_read")!;
    const res = await read.handler({ method: "get", org_id: ORG, vendor_id: ID });
    expect(res.isError).toBeUndefined();
    expect(calls[0]).toMatchObject({ method: "GET", path: `/organizations/${ORG}/vendors/${ID}` });
  });

  it("re-validates against the method's schema and names the missing field", async () => {
    const byName = new Map(collectExposedTools().map((t) => [t.name, t]));
    const read = byName.get("scf_vendor_read")!;
    const res = await read.handler({ method: "get", org_id: ORG });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/scf_vendor_read method get: vendor_id/);
    expect(calls).toHaveLength(0);
  });

  it("rejects an unknown method without calling the platform", async () => {
    const byName = new Map(collectExposedTools().map((t) => [t.name, t]));
    const res = await byName.get("scf_vendor_read")!.handler({ method: "explode", org_id: ORG });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/unknown method explode/);
    expect(calls).toHaveLength(0);
  });

  it("ignores arguments that belong to other methods", async () => {
    const byName = new Map(collectExposedTools().map((t) => [t.name, t]));
    await byName.get("scf_vendor_read")!.handler({ method: "list", org_id: ORG, vendor_id: ID });
    expect(calls[0].path).toBe(`/organizations/${ORG}/vendors`);
  });

  it("a single-method tool is exposed unchanged", () => {
    const collector = new ToolCollector();
    registerVendorTools(collector as unknown as McpServer);
    const byName = new Map(collectExposedTools().map((t) => [t.name, t]));
    const exposed = byName.get("scf_list_evidence_tasks")!;
    expect(exposed.methods).toEqual({ list: "scf_list_evidence_tasks" });
    expect(Object.keys(exposed.shape)).not.toContain("method");
  });
});

describe("progressive disclosure over a real MCP connection", () => {
  async function connect(loadAll: boolean) {
    const server = createServer({ loadAll });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientTransport);
    return { client, server };
  }

  it("lists only the core groups plus the loader at startup", async () => {
    const { client } = await connect(false);
    const names = (await client.listTools()).tools.map((t) => t.name);
    const coreTools = collectExposedTools().filter((t) => PLAN.core_groups.includes(t.group));
    expect(names).toHaveLength(coreTools.length + 1);
    expect(names).toContain(LOAD_TOOLS_NAME);
    expect(names).toContain("scf_evidence_read");
    expect(names).not.toContain("scf_team_read");
    expect(names.indexOf("scf_catalog_read")).toBeLessThan(names.indexOf(LOAD_TOOLS_NAME));
  });

  it("scf_load_tools enables a group, announces the change, and the tools then work", async () => {
    const { client } = await connect(false);
    let changes = 0;
    client.setNotificationHandler(
      z.object({ method: z.literal("notifications/tools/list_changed"), params: z.unknown().optional() }),
      async () => {
        changes += 1;
      },
    );
    const res = await client.callTool({ name: LOAD_TOOLS_NAME, arguments: { groups: ["teams"] } });
    const body = JSON.parse((res.content as Array<{ text: string }>)[0].text);
    expect(body.loaded_groups).toEqual(["teams"]);
    expect(body.tools.map((t: { name: string }) => t.name)).toEqual(["scf_team_read", "scf_team_write"]);
    expect(body.tools[0].methods).toEqual(["list", "get", "functions", "assignments"]);

    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("scf_team_read");
    expect(names).not.toContain("scf_document_read");
    expect(changes).toBeGreaterThan(0);

    await client.callTool({ name: "scf_team_read", arguments: { method: "list", org_id: ORG } });
    expect(calls[0].path).toBe(`/organizations/${ORG}/teams`);
  });

  it("groups: all loads everything, and loading twice is harmless", async () => {
    const { client } = await connect(false);
    await client.callTool({ name: LOAD_TOOLS_NAME, arguments: { groups: ["all"] } });
    await client.callTool({ name: LOAD_TOOLS_NAME, arguments: { groups: ["webhooks"] } });
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toHaveLength(Object.keys(PLAN.tools).length + 1);
  });

  it("SCF_LOAD_ALL_TOOLS exposes the whole surface up front", async () => {
    expect(loadAllFromEnv({ SCF_LOAD_ALL_TOOLS: "true" })).toBe(true);
    expect(loadAllFromEnv({ SCF_LOAD_ALL_TOOLS: "0" })).toBe(false);
    expect(loadAllFromEnv({})).toBe(false);
    const { client } = await connect(true);
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toHaveLength(Object.keys(PLAN.tools).length + 1);
  });

  it("a disabled tool cannot be called before its group is loaded", async () => {
    const { client } = await connect(false);
    const res = await client.callTool({ name: "scf_team_read", arguments: { method: "list", org_id: ORG } });
    expect(res.isError).toBe(true);
    expect((res.content as Array<{ text: string }>)[0].text).toMatch(/disabled|not found/i);
    expect(calls).toHaveLength(0);
  });
});
