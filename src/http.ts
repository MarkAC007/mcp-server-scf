#!/usr/bin/env node

/**
 * Streamable HTTP transport for mcp-server-scf (hosted, multi-user).
 *
 * Bring-your-own-key: every request must carry `Authorization: Bearer scf_…`,
 * the caller's own SCF Controls Platform API key. The server forwards it to the
 * one platform the operator configured in SCF_API_URL. Nothing in a request can
 * change that destination: the only headers read here are host, origin,
 * authorization and content-length (the SDK reads content-type and accept).
 *
 * Stateless: one McpServer and one transport per POST, torn down when the
 * response closes. Tool handlers reach the caller's key through
 * runWithClient(), never through process.env.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, collectExposedTools } from "./server.js";
import { ScfApiClient, runWithClient } from "./lib/api-client.js";
import { ScfApiError } from "./lib/errors.js";
import { loadAllFromEnv, LOAD_ALL_ENV } from "./consolidation/registry.js";
import { PKG_NAME, PKG_VERSION } from "./lib/version.js";

export interface HttpConfig {
  /** TCP port to listen on. PORT, default 3000. */
  port: number;
  /** Bind address. MCP_HTTP_HOST, default 127.0.0.1; set 0.0.0.0 inside a container. */
  host: string;
  /** SCF_API_URL — the one platform this deployment talks to. Fixed server-side, never from a caller. */
  apiUrl: string;
  /** MCP_ALLOWED_HOSTS — comma-separated Host allow-list; empty = any. Set it to the public hostname behind a tunnel. */
  allowedHosts: string[];
  /** MCP_ALLOWED_ORIGINS — comma-separated Origin allow-list; a request with an Origin not listed is refused. */
  allowedOrigins: string[];
  /** MCP_MAX_BODY_BYTES, default 1 MiB. */
  maxBodyBytes: number;
  /** MCP_REQUEST_TIMEOUT_MS — socket inactivity timeout per request, default 120 s. */
  requestTimeoutMs: number;
  /** SCF_API_TIMEOUT_MS — upstream fetch timeout, default 90 s (under Cloudflare's 100 s). */
  apiTimeoutMs: number;
  /** SCF_LOAD_ALL_TOOLS — default true on HTTP: scf_load_tools state lives in a McpServer, which here lasts one request. */
  loadAll: boolean;
  /** MCP_JSON_RESPONSE — default false: SSE responses carry keep-alives, which proxies with idle limits need. */
  jsonResponse: boolean;
}

const BEARER = /^Bearer\s+(scf_[A-Za-z0-9_-]{8,})$/;

function csv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function positiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0)
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(value)}`);
  return n;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): HttpConfig {
  if (env.SCF_API_KEY) {
    throw new Error(
      "SCF_API_KEY is set, but the HTTP transport is bring-your-own-key: hosted mode must not carry a server-side key. Unset it.",
    );
  }
  const apiUrl = env.SCF_API_URL;
  if (!apiUrl) throw new Error("SCF_API_URL is required (fixed server-side; callers never set it)");
  if (!/^https?:\/\/[^\s/]+/i.test(apiUrl)) throw new Error("SCF_API_URL must be an http(s) URL");
  return {
    port: positiveInt(env.PORT, 3000, "PORT"),
    host: env.MCP_HTTP_HOST ?? "127.0.0.1",
    apiUrl,
    allowedHosts: csv(env.MCP_ALLOWED_HOSTS),
    allowedOrigins: csv(env.MCP_ALLOWED_ORIGINS),
    maxBodyBytes: positiveInt(env.MCP_MAX_BODY_BYTES, 1_048_576, "MCP_MAX_BODY_BYTES"),
    requestTimeoutMs: positiveInt(env.MCP_REQUEST_TIMEOUT_MS, 120_000, "MCP_REQUEST_TIMEOUT_MS"),
    apiTimeoutMs: positiveInt(env.SCF_API_TIMEOUT_MS, 90_000, "SCF_API_TIMEOUT_MS"),
    loadAll: env[LOAD_ALL_ENV] === undefined ? true : loadAllFromEnv(env),
    jsonResponse: /^(1|true|yes)$/i.test((env.MCP_JSON_RESPONSE ?? "").trim()),
  };
}

function rpcError(
  res: ServerResponse,
  status: number,
  code: number,
  message: string,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

function unauthorized(res: ServerResponse, detail: string) {
  rpcError(res, 401, -32001, detail, {
    "WWW-Authenticate": 'Bearer realm="mcp-server-scf", error="invalid_token"',
  });
}

class PayloadTooLarge extends Error {
  readonly status = 413;
}

async function readJsonBody(req: IncomingMessage, limit: number): Promise<unknown> {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > limit) throw new PayloadTooLarge("payload too large");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new PayloadTooLarge("payload too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

type RpcMessage = { method?: unknown; params?: { name?: unknown } };

/** What to log for a request: the JSON-RPC method and, for tools/call, the tool name. Never arguments. */
function describeBody(body: unknown): string {
  const msgs = (Array.isArray(body) ? body : [body]) as RpcMessage[];
  return msgs
    .map((m) => {
      if (!m || typeof m !== "object" || typeof m.method !== "string") return "?";
      const tool = m.method === "tools/call" && typeof m.params?.name === "string" ? `(${m.params.name})` : "";
      return `${m.method}${tool}`;
    })
    .join(",");
}

/**
 * Keys the platform has just rejected are answered 401 here for a short while,
 * so a caller hammering the relay with bad keys does not become a stream of
 * upstream auth lookups. Keyed by hash; the key value is never stored.
 */
const REJECT_TTL_MS = 60_000;
const rejected = new Map<string, number>();

function rejectKeyHash(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function recentlyRejected(hash: string, now = Date.now()): boolean {
  const until = rejected.get(hash);
  if (until === undefined) return false;
  if (until <= now) {
    rejected.delete(hash);
    return false;
  }
  return true;
}

function rememberRejected(hash: string, now = Date.now()): void {
  if (rejected.size >= 10_000) {
    for (const [h, until] of rejected) if (until <= now) rejected.delete(h);
    if (rejected.size >= 10_000) rejected.clear();
  }
  rejected.set(hash, now + REJECT_TTL_MS);
}

function isInitialize(body: unknown): boolean {
  const msgs = (Array.isArray(body) ? body : [body]) as RpcMessage[];
  return msgs.some((m) => m && typeof m === "object" && m.method === "initialize");
}

export function createMcpHttpServer(config: HttpConfig) {
  // The tool surface is static: collect it once per process, build a McpServer per request.
  const exposed = collectExposedTools();

  const server = createHttpServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url ?? "/", "http://localhost");
    let detail = "";
    // Access log: method, path, status, duration, JSON-RPC method and key prefix only.
    // req.headers is never logged — it carries the Authorization value.
    res.on("finish", () =>
      console.error(
        `[mcp-server-scf] ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms${detail ? ` ${detail}` : ""}`,
      ),
    );
    res.setTimeout(config.requestTimeoutMs, () => res.destroy());

    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(
        JSON.stringify({ status: "ok", name: PKG_NAME, version: PKG_VERSION, transport: "streamable-http" }),
      );
    }
    if (url.pathname !== "/mcp") {
      res.writeHead(404);
      return res.end();
    }
    if (config.allowedHosts.length) {
      const host = (req.headers.host ?? "").toLowerCase();
      if (!config.allowedHosts.includes(host)) {
        res.writeHead(421, { "Content-Type": "application/json" }); // Misdirected Request
        return res.end(JSON.stringify({ error: "host not allowed" }));
      }
    }
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin.toLowerCase())) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "origin not allowed" }));
    }
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST", "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "method not allowed" }));
    }
    const m = BEARER.exec(req.headers.authorization ?? "");
    if (!m)
      return unauthorized(
        res,
        "Missing or malformed Authorization header; expected: Bearer scf_<your platform API key>",
      );
    const apiKey = m[1];
    detail = `key=${apiKey.slice(0, 8)}…`;
    const keyHash = rejectKeyHash(apiKey);
    if (recentlyRejected(keyHash)) return unauthorized(res, "The SCF platform rejected this API key");

    let body: unknown;
    try {
      body = await readJsonBody(req, config.maxBodyBytes);
    } catch (err) {
      if (err instanceof PayloadTooLarge) return rpcError(res, 413, -32600, "Payload too large");
      return rpcError(res, 400, -32700, "Parse error");
    }
    detail += ` rpc=${describeBody(body)}`;

    // apiUrl is the operator's. Nothing in the request can redirect it.
    const client = new ScfApiClient({ baseUrl: config.apiUrl, apiKey, timeoutMs: config.apiTimeoutMs });

    // Fail a revoked or mistyped key at connect time, once per session, instead of on every tool call.
    if (isInitialize(body)) {
      try {
        await client.get("/users/me");
      } catch (err) {
        if (err instanceof ScfApiError && err.statusCode === 401) {
          rememberRejected(keyHash);
          return unauthorized(res, "The SCF platform rejected this API key");
        }
        // Any other upstream trouble surfaces on the first tool call with its own message.
      }
    }

    const mcp = createServer({ loadAll: config.loadAll }, exposed);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: config.jsonResponse,
    });
    res.on("close", () => {
      void transport.close();
      void mcp.close();
    });
    try {
      await runWithClient(client, async () => {
        await mcp.connect(transport);
        await transport.handleRequest(req, res, body);
      });
    } catch (err) {
      console.error(`[mcp-server-scf] request failed: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) rpcError(res, 500, -32603, "Internal error");
      else res.destroy();
    }
  });

  // Longer than cloudflared's 90 s idle-connection timeout, so the proxy never reuses a socket we just closed.
  server.keepAliveTimeout = 125_000;
  // Node wants headersTimeout <= requestTimeout; both are about receiving the request, not sending the response.
  server.headersTimeout = 60_000;
  server.requestTimeout = Math.max(130_000, config.requestTimeoutMs + 10_000);
  return server;
}

export function startHttpServer(
  config: HttpConfig,
): Promise<{ server: ReturnType<typeof createMcpHttpServer>; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createMcpHttpServer(config);
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      const addr = server.address();
      resolve({ server, port: typeof addr === "object" && addr ? addr.port : config.port });
    });
  });
}

function isMain(): boolean {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  startHttpServer(configFromEnv())
    .then(({ server, port }) => {
      console.error(`SCF MCP Server (streamable-http) listening on ${port}/mcp, upstream ${configFromEnv().apiUrl}`);
      const stop = () => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5_000).unref();
      };
      process.on("SIGTERM", stop);
      process.on("SIGINT", stop);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
