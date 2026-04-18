# Architecture

`mcp-server-scf` is a thin, stateless Node.js process that translates MCP tool calls into HTTP requests against the SCF Controls Platform API. It has no local database, no background jobs, and no caching layer — the platform is the single source of truth.

---

## Process model

The server runs as a child process of the MCP client (Claude Desktop, Claude Code, Cursor, etc.) and communicates over stdio using the MCP framing protocol.

```
MCP client (Claude Desktop / Code / Cursor)
      │  (stdio: stdin/stdout, MCP JSON-RPC framing)
      ▼
mcp-server-scf  (Node.js ≥18, ESM, single long-lived process)
      │  (HTTPS, Bearer token)
      ▼
SCF Controls Platform API  (eu.scfcontrolsplatform.app by default)
```

Because stdio is the transport, **anything written to `stdout` corrupts the protocol frame**. All logging in this server goes to `stderr` via `console.error` — including the startup banner ([`src/index.ts:44`](../src/index.ts:44)). When adding new tools, never introduce `console.log` or raw `process.stdout.write` calls.

---

## Source layout

```
src/
├── index.ts              Entry point. Constructs McpServer, wires
│                         StdioServerTransport, calls each register*
│                         function to attach tools, starts the loop.
├── tools/
│   ├── catalog.ts        6 tools — read-only SCF reference data
│   ├── scoped-controls.ts 6 tools — per-org implementation tracking
│   ├── evidence.ts       19 tools — CRUD, files, validation, AI
│   │                     assessments (per-file + windowed)
│   ├── risk.ts           12 tools — risk register + custom risks
│   ├── vendors.ts        7 tools — TPRM + AI research + DPSIA
│   ├── organization.ts   7 tools — user, orgs, audit, notifications
│   ├── capabilities.ts   9 tools — KSI themes, systems, scorecards
│   └── webhooks.ts       6 tools — webhook endpoints + deliveries
└── lib/
    ├── api-client.ts     ScfApiClient — fetch wrapper with auth,
    │                     pagination helpers, typed get/post/patch/delete.
    └── errors.ts         ScfApiError + formatError + errorResult.
```

Total: **72 tools across 8 domain files**. The per-domain docs live under [`docs/tools/`](tools/).

---

## Request flow

Every tool follows the same shape:

1. **Tool invocation** — the MCP client sends a `tools/call` request with validated arguments (Zod schema enforces types, ranges, and required fields before the handler runs).
2. **Client construction** — the handler calls `getClient()` ([`src/lib/api-client.ts:104`](../src/lib/api-client.ts:104)), a lazy singleton that reads `SCF_API_KEY` and `SCF_API_URL` from the environment the first time it's called.
3. **HTTP request** — `client.get|post|patch|delete(path, ...)` issues a `fetch` to `${baseUrl}/api${path}` with `Authorization: Bearer ${apiKey}`. Mutation methods always send `Content-Type: application/json` and a JSON body (at least `{}`) to satisfy FastAPI's Pydantic body-parameter requirement.
4. **Response handling** — on `2xx`, the JSON body is returned as the tool result. On any non-2xx, `ScfApiError` is thrown with the parsed `detail`/`error`/`message` field and the HTTP status code.
5. **Error translation** — the handler's `try/catch` pipes thrown errors into `errorResult(error)`, which returns an MCP content array with `isError: true` and a human-readable message via `formatError`.

The client has no retry logic — it's the caller's responsibility to retry on `429` or transient `5xx`.

---

## Error model

All error responses use `isError: true` with a single text block. `ScfApiError` status codes are translated to user-facing messages ([`src/lib/errors.ts:12`](../src/lib/errors.ts:12)):

| Status | Translated message                                                     |
| ------ | ---------------------------------------------------------------------- |
| 401    | "Authentication failed. Check your `SCF_API_KEY`."                     |
| 402    | "Subscription limit reached. Upgrade your plan to continue."           |
| 403    | "Access denied. Your API key may lack permissions for this operation." |
| 404    | `Not found: ${error.message}`                                          |
| 429    | "Rate limited. Please wait before retrying."                           |
| Other  | `API error (${statusCode}): ${error.message}`                          |

Non-`ScfApiError` errors (network failures, JSON parse errors) fall through to `error.message`. API keys are never logged and never included in the error payload.

---

## Rate limiting

The platform enforces **100 read requests/min and 20 write requests/min** per API key. When exceeded, the server returns `429` and this server surfaces it as "Rate limited. Please wait before retrying." Clients should back off and retry. The server does not implement automatic retry — batch operations (`batch_update_controls`, `bulk_assess_evidence`, `bulk_assess_windows`) exist specifically to avoid hitting these limits when mutating many records.

---

## Configuration

Configuration is environment-only — there is no config file. See [`docs/authentication.md`](authentication.md) for API key setup and region selection.

| Variable      | Required | Default                              | Purpose                                                  |
| ------------- | -------- | ------------------------------------ | -------------------------------------------------------- |
| `SCF_API_KEY` | Yes      | —                                    | Bearer token for every request (format: `scf_…`)         |
| `SCF_API_URL` | No       | `https://eu.scfcontrolsplatform.app` | Platform endpoint; switch to the US endpoint if required |

---

## What this server does **not** do

- No persistent storage. Every request hits the platform.
- No caching. Successive `list_controls` calls re-fetch.
- No background jobs. Long-running platform tasks (`trigger_vendor_research`, `trigger_dpsia`, `trigger_window_assessment`) return a task ID; the client polls via the corresponding `get_*` tool.
- No webhook receiver. `create_webhook` provisions a platform-side endpoint; external systems POST directly to the platform, not to this server.
- No streaming. All responses are buffered JSON.
