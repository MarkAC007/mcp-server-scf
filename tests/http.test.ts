import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer as createRawServer, request as rawRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { configFromEnv, createMcpHttpServer, type HttpConfig } from "../src/http.js";

// The consolidated surface exposes scf_get_current_user as scf_user_read method "me" (src/consolidation/plan.json),
// which calls GET {apiUrl}/api/users/me (src/tools/organization.ts).
const CURRENT_USER_TOOL = "scf_user_read";
const CURRENT_USER_ARGS = { method: "me" };
const CURRENT_USER_PATH = "/api/users/me";

const KEY_A = "scf_testkey_AAAAAAAA";
const KEY_B = "scf_testkey_BBBBBBBB";

// ---------- stub SCF platform ----------
interface Recorded {
  method: string;
  path: string;
  authorization: string | undefined;
}
const recorded: Recorded[] = [];
let platform: Server;
let platformUrl: string;

// ---------- MCP HTTP server(s) under test ----------
const servers: Server[] = [];
let mcpPort: number;

// Every console line emitted while this file runs; test (k) checks none carries a key.
const logLines: string[] = [];

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
  });
}

function baseConfig(overrides: Partial<HttpConfig> = {}): HttpConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    apiUrl: platformUrl,
    allowedHosts: [],
    maxBodyBytes: 1_048_576,
    requestTimeoutMs: 120_000,
    loadAll: true,
    jsonResponse: true,
    ...overrides,
  };
}

async function startMcp(overrides: Partial<HttpConfig> = {}): Promise<number> {
  const server = createMcpHttpServer(baseConfig(overrides));
  servers.push(server);
  return listen(server);
}

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** Plain node:http request so the test controls Host and Content-Length exactly. Fails fast instead of hanging. */
function raw(
  port: number,
  opts: { method: string; path: string; headers?: Record<string, string | number>; body?: string },
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const req = rawRequest(
      { host: "127.0.0.1", port, method: opts.method, path: opts.path, headers: opts.headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          settled = true;
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") });
        });
        res.on("error", () => {
          if (!settled) {
            settled = true;
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          }
        });
      },
    );
    req.setTimeout(5_000, () => {
      if (!settled) {
        settled = true;
        req.destroy();
        reject(new Error(`${opts.method} ${opts.path} did not respond within 5 s`));
      }
    });
    // The server may answer (e.g. 413) and close before the body is written; that is not a test failure.
    req.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    if (opts.body !== undefined) req.write(opts.body);
    req.end();
  });
}

async function connectClient(apiKey: string, extraHeaders: Record<string, string> = {}, query = ""): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${mcpPort}/mcp${query}`), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}`, ...extraHeaders } },
  });
  const client = new Client({ name: "http-test", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

function resultText(result: unknown): string {
  return JSON.stringify(result);
}

beforeAll(async () => {
  for (const level of ["error", "warn", "log", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logLines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    });
  }

  platform = createRawServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://stub").pathname;
    const authorization = req.headers.authorization;
    recorded.push({ method: req.method ?? "", path, authorization });
    // Small delay so concurrent calls genuinely overlap inside the MCP server.
    setTimeout(() => {
      if (req.method === "GET" && path === CURRENT_USER_PATH) {
        res.writeHead(200, { "Content-Type": "application/json" });
        // Echo the caller's credential so a cross-talk bug would surface in the other client's result.
        res.end(JSON.stringify({ id: "user-1", email: "user@example.test", seen_authorization: authorization }));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: "not found" }));
    }, 50);
  });
  const platformPort = await listen(platform);
  platformUrl = `http://127.0.0.1:${platformPort}`;

  mcpPort = await startMcp();
});

afterAll(async () => {
  for (const s of [...servers, platform]) {
    if (!s) continue;
    s.closeAllConnections?.();
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  vi.restoreAllMocks();
});

describe("HTTP transport: plain routes and guards", () => {
  it("(a) GET /healthz is 200 without auth and reports the streamable-http transport", async () => {
    const res = await raw(mcpPort, { method: "GET", path: "/healthz" });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.transport).toBe("streamable-http");
    expect(typeof body.name).toBe("string");
    expect(typeof body.version).toBe("string");
  });

  it("any path other than /healthz and /mcp is 404", async () => {
    const res = await raw(mcpPort, { method: "GET", path: "/nope", headers: { Authorization: `Bearer ${KEY_A}` } });
    expect(res.status).toBe(404);
  });

  it("(b) POST /mcp with no Authorization is 401 with WWW-Authenticate: Bearer and a JSON-RPC error body", async () => {
    const res = await raw(mcpPort, {
      method: "POST",
      path: "/mcp",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
    expect(String(res.headers["www-authenticate"] ?? "")).toMatch(/^Bearer/);
    const body = JSON.parse(res.body);
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error).toBeDefined();
  });

  it.each(["Bearer notakey", "Bearer scf_short", "Basic scf_testkey_AAAAAAAA", `Bearer ${KEY_A}x y`])(
    "(c) POST /mcp with malformed Authorization %j is 401",
    async (authorization) => {
      const res = await raw(mcpPort, {
        method: "POST",
        path: "/mcp",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      expect(res.status).toBe(401);
      expect(String(res.headers["www-authenticate"] ?? "")).toMatch(/^Bearer/);
    },
  );

  it.each(["GET", "DELETE"])("(d) %s /mcp with a valid-format bearer is 405", async (method) => {
    const res = await raw(mcpPort, {
      method,
      path: "/mcp",
      headers: { Authorization: `Bearer ${KEY_A}`, Accept: "application/json, text/event-stream" },
    });
    expect(res.status).toBe(405);
  });

  it("(e) POST /mcp with Content-Length above maxBodyBytes is 413", async () => {
    const port = await startMcp({ maxBodyBytes: 1024 });
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: { pad: "x".repeat(4096) } });
    const res = await raw(port, {
      method: "POST",
      path: "/mcp",
      headers: {
        Authorization: `Bearer ${KEY_A}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Content-Length": Buffer.byteLength(body),
      },
      body,
    });
    expect(res.status).toBe(413);
  });

  it("(f) a Host header outside allowedHosts is 421", async () => {
    const port = await startMcp({ allowedHosts: ["allowed.example"] });
    const res = await raw(port, {
      method: "POST",
      path: "/mcp",
      headers: {
        Host: "other.example",
        Authorization: `Bearer ${KEY_A}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(421);
  });
});

describe("HTTP transport: MCP round trips against a stub platform", () => {
  it("(g) lists the consolidated surface and forwards the caller's own bearer to the platform", async () => {
    const client = await connectClient(KEY_A);
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      expect(tools.length).toBeGreaterThan(40);
      expect(names).toContain(CURRENT_USER_TOOL);

      const before = recorded.length;
      const result = await client.callTool({ name: CURRENT_USER_TOOL, arguments: CURRENT_USER_ARGS });
      expect(result.isError).toBeFalsy();
      expect(resultText(result)).toContain("user@example.test");

      const calls = recorded.slice(before).filter((r) => r.path === CURRENT_USER_PATH);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe("GET");
      expect(calls[0].authorization).toBe(`Bearer ${KEY_A}`);
    } finally {
      await client.close();
    }
  });

  it("(h) two clients with different keys calling concurrently never see each other's key", async () => {
    const [a, b] = await Promise.all([connectClient(KEY_A), connectClient(KEY_B)]);
    try {
      const before = recorded.length;
      const [ra, rb] = await Promise.all([
        a.callTool({ name: CURRENT_USER_TOOL, arguments: CURRENT_USER_ARGS }),
        b.callTool({ name: CURRENT_USER_TOOL, arguments: CURRENT_USER_ARGS }),
      ]);
      const calls = recorded.slice(before).filter((r) => r.path === CURRENT_USER_PATH);
      expect(calls).toHaveLength(2);
      expect(calls.map((c) => c.authorization).sort()).toEqual([`Bearer ${KEY_A}`, `Bearer ${KEY_B}`]);

      const ta = resultText(ra);
      const tb = resultText(rb);
      expect(ta).toContain(KEY_A);
      expect(ta).not.toContain(KEY_B);
      expect(tb).toContain(KEY_B);
      expect(tb).not.toContain(KEY_A);
    } finally {
      await Promise.all([a.close(), b.close()]);
    }
  });

  it("(i) an X-SCF-API-URL header and ?api_url= query cannot redirect the upstream", async () => {
    const decoy = "http://127.0.0.1:9/";
    const client = await connectClient(KEY_A, { "X-SCF-API-URL": decoy }, `?api_url=${encodeURIComponent(decoy)}`);
    try {
      const before = recorded.length;
      const result = await client.callTool({ name: CURRENT_USER_TOOL, arguments: CURRENT_USER_ARGS });
      expect(result.isError).toBeFalsy();
      const calls = recorded.slice(before).filter((r) => r.path === CURRENT_USER_PATH);
      expect(calls).toHaveLength(1);
      expect(calls[0].authorization).toBe(`Bearer ${KEY_A}`);
    } finally {
      await client.close();
    }
  });
});

describe("configFromEnv", () => {
  it("(j) throws when SCF_API_KEY is set (hosted mode carries no server-side key)", () => {
    expect(() =>
      configFromEnv({ SCF_API_URL: "https://platform.example", SCF_API_KEY: "scf_serverside_key" }),
    ).toThrow();
  });

  it("(j) throws when SCF_API_URL is missing", () => {
    expect(() => configFromEnv({})).toThrow(/SCF_API_URL/);
  });

  it("throws when SCF_API_URL is not http(s)", () => {
    expect(() => configFromEnv({ SCF_API_URL: "file:///etc/passwd" })).toThrow();
  });

  it("applies the documented defaults and lower-cases MCP_ALLOWED_HOSTS", () => {
    const cfg = configFromEnv({
      SCF_API_URL: "https://platform.example",
      MCP_ALLOWED_HOSTS: "MCP.Example.COM, other.example",
    });
    expect(cfg).toMatchObject({
      port: 3000,
      host: "127.0.0.1",
      apiUrl: "https://platform.example",
      maxBodyBytes: 1_048_576,
      requestTimeoutMs: 120_000,
      loadAll: true,
      jsonResponse: false,
    });
    expect(cfg.allowedHosts).toEqual(["mcp.example.com", "other.example"]);
  });
});

describe("logging hygiene", () => {
  it("(k) no console output ever contains an API key", async () => {
    const client = await connectClient(KEY_A);
    try {
      await client.callTool({ name: CURRENT_USER_TOOL, arguments: CURRENT_USER_ARGS });
    } finally {
      await client.close();
    }
    // Positive control: the access log did run, so an empty capture cannot pass this vacuously.
    expect(logLines.some((l) => l.includes("/mcp"))).toBe(true);
    expect(logLines.filter((l) => l.includes("scf_testkey"))).toEqual([]);
  });
});
