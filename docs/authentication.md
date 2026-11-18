# Authentication

`mcp-server-scf` authenticates to the SCF Controls Platform using a single Bearer token passed as `SCF_API_KEY`. There is no OAuth flow, no session cookie, and no local credential store — the key is read from the environment on first use and attached to every request as `Authorization: Bearer scf_...`.

---

## Getting an API key

The SCF Controls Platform is **self-hosted** — there is no hosted/SaaS instance. Keys are generated in your own deployment ([deploy one from the OSS repo](https://github.com/MarkAC007/scf-controls-platform-oss)):

1. Sign in to **your own instance** (e.g. `http://localhost:8000`).
2. Open **Settings → API Keys**.
3. Click **Generate New Key**.
4. Copy the key immediately — it's shown once. Keys are stored server-side as SHA-256 hashes and cannot be recovered after the dialog closes.

### Key format

API keys always start with the `scf_` prefix:

```
scf_abcdef1234567890…
```

This prefix lets secret-scanning tools (Gitleaks, GitHub secret scanning, Socket) fingerprint accidental commits. If a key lands in git history, rotate it immediately — the `scf_` prefix is the regex used by upstream scanners, so GitHub will notify the platform.

---

## Providing the key to the server

The server reads the environment only when the first tool is called ([`src/lib/api-client.ts:104`](../src/lib/api-client.ts:104)). Set the key in the MCP client's environment block — not in a shell profile, because MCP clients launch the server as a child process with a minimal environment.

### Claude Desktop

```json
{
  "mcpServers": {
    "scf": {
      "command": "npx",
      "args": ["-y", "mcp-server-scf"],
      "env": {
        "SCF_API_KEY": "scf_your_api_key_here",
        "SCF_API_URL": "https://scf.your-domain.example"
      }
    }
  }
}
```

Config paths:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code

```bash
claude mcp add scf -- npx -y mcp-server-scf
export SCF_API_KEY="scf_your_api_key_here"
export SCF_API_URL="https://scf.your-domain.example"
```

Claude Code inherits your shell environment, so `export` in your shell profile works here. Claude Desktop does not.

### Cursor / Windsurf

```json
{
  "mcpServers": {
    "scf": {
      "command": "npx",
      "args": ["-y", "mcp-server-scf"],
      "env": {
        "SCF_API_KEY": "scf_your_api_key_here",
        "SCF_API_URL": "https://scf.your-domain.example"
      }
    }
  }
}
```

Both clients use an `mcp.json` (or equivalent) in the workspace or user config directory.

### Docker

```json
{
  "mcpServers": {
    "scf": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "SCF_API_KEY", "-e", "SCF_API_URL", "markac007/mcp-server-scf"],
      "env": {
        "SCF_API_KEY": "scf_your_api_key_here",
        "SCF_API_URL": "https://scf.your-domain.example"
      }
    }
  }
}
```

The `-e SCF_API_KEY` flag (without a value) passes the variable through from the client's `env` block into the container — the key itself never appears in the container args list.

---

## Remote (Streamable HTTP) — bring your own key

`mcp-server-scf-http` (`build/http.js`) serves the same tool surface over MCP Streamable HTTP for clients that connect by URL. It is **multi-user by design**: there is no server-side key. Each caller sends their own platform API key on every request as `Authorization: Bearer scf_…`, and the server forwards it to the one platform the operator configured in `SCF_API_URL`. Nothing a caller sends can change that destination.

### Connecting (Claude Code)

```bash
claude mcp add --transport http scf https://<mcp-hostname>/mcp \
  --header "Authorization: Bearer scf_your_api_key_here"
```

Generate the key in the platform under **Settings → API Keys**; it identifies you, so every tool call runs with your own memberships and roles. A missing or malformed header returns `401` with `WWW-Authenticate: Bearer`; a key the platform rejects returns `401` at `initialize`, so a revoked key fails at connect time rather than on the first tool call.

### Running the server

```bash
SCF_API_URL=https://scf.your-domain.example MCP_HTTP_HOST=0.0.0.0 PORT=8080 \
MCP_ALLOWED_HOSTS=mcp.your-domain.example node build/http.js
```

| Variable                 | Default              | Meaning                                                                                                                    |
| ------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SCF_API_URL`            | required             | The platform every request is forwarded to. Fixed per deployment.                                                          |
| `SCF_API_KEY`            | must be unset        | The HTTP transport refuses to start if a server-side key is present.                                                       |
| `PORT` / `MCP_HTTP_HOST` | `3000` / `127.0.0.1` | Listen address. Bind `0.0.0.0` inside a container.                                                                         |
| `MCP_ALLOWED_HOSTS`      | any                  | Comma-separated `Host` allow-list; other hosts get `421`. Set it to the public hostname.                                   |
| `MCP_ALLOWED_ORIGINS`    | none                 | Browser `Origin` allow-list; a request with an unlisted `Origin` gets `403`.                                               |
| `MCP_MAX_BODY_BYTES`     | `1048576`            | Larger request bodies get `413`.                                                                                           |
| `MCP_REQUEST_TIMEOUT_MS` | `120000`             | Socket inactivity timeout per request.                                                                                     |
| `SCF_API_TIMEOUT_MS`     | `90000`              | Upstream fetch timeout.                                                                                                    |
| `SCF_LOAD_ALL_TOOLS`     | `true` on HTTP       | The server is stateless (one `McpServer` per request), so `scf_load_tools` state would not persist; all groups are listed. |
| `MCP_JSON_RESPONSE`      | `false`              | `true` answers with plain JSON instead of SSE. SSE carries keep-alives, which proxies with idle limits need.               |

Routes: `POST /mcp` (MCP), `GET /healthz` (no auth, never calls the platform). `GET`/`DELETE /mcp` return `405`; everything else `404`. The access log records method, path, status, duration, the JSON-RPC method, the tool name and the first 8 characters of the key, never the header.

A hardened Docker Compose example (own network, no host ports, Cloudflare Tunnel) is in [`deploy/compose.http.example.yml`](../deploy/compose.http.example.yml).

---

## Platform URL

There is no default URL. The former hosted instance (`uk.scfcontrolsplatform.app`) has been **decommissioned** — the platform is self-hosted only, so `SCF_API_URL` is **required** and must point at the base URL of your own deployment (e.g. `http://localhost:8000` for a local Docker Compose stack, or wherever you expose it). The server refuses to start a request without it and tells you exactly this.

---

## Rotation

Platform-side rotation is a two-step process:

1. Generate a new key in **Settings → API Keys**. You'll have two active keys temporarily.
2. Update the `SCF_API_KEY` value in every MCP client config, restart the client, and verify tools work.
3. Revoke the old key from the platform.

There is no automated rotation hook in this server — secrets are expected to live in the MCP client configuration. For Docker deployments, wire the key through a secret manager (AWS Secrets Manager, 1Password, etc.) and inject via `-e` at runtime.

---

## Scopes and permissions

Today there is one key type with full access to any organization the user belongs to; fine-grained scopes are planned but not shipped. Role-based access (`admin`, `editor`, `viewer`) is enforced **per organization membership**, not per key — a `viewer` membership cannot invoke write-tagged tools like `scf_update_scoped_control` or `scf_revalidate_evidence_file` regardless of which key they use. A `403 Access denied` response usually means the authenticated user lacks the required role in the target org.

---

## Security properties

- **Never logged.** `SCF_API_KEY` is never printed to stderr, never included in error messages, never appears in `--debug` output.
- **Server-side hashing.** Keys are stored as SHA-256 hashes; the platform operator cannot retrieve your plaintext key.
- **Use HTTPS across networks.** Plain HTTP is acceptable only for localhost/loopback deployments; anything reachable over a network should sit behind TLS (reverse proxy). The client does not support custom CAs.
- **Short-lived mutations.** Pre-signed download URLs returned by `scf_get_evidence_file` expire after 15 minutes.
- **npm provenance.** Every published version is cryptographically linked to its source commit via [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements) issued through GitHub Actions OIDC — no long-lived npm tokens anywhere in the release pipeline.
