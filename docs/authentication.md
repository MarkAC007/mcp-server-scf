# Authentication

`mcp-server-scf` authenticates to the SCF Controls Platform using a single Bearer token passed as `SCF_API_KEY`. There is no OAuth flow, no session cookie, and no local credential store — the key is read from the environment on first use and attached to every request as `Authorization: Bearer scf_...`.

---

## Getting an API key

1. Sign up or sign in at your region's platform URL:
   - **UK (default):** [uk.scfcontrolsplatform.app](https://uk.scfcontrolsplatform.app)
   - **US:** [scfcontrolsplatform.com](https://scfcontrolsplatform.com)
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
        "SCF_API_URL": "https://uk.scfcontrolsplatform.app"
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
export SCF_API_URL="https://uk.scfcontrolsplatform.app"
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
        "SCF_API_URL": "https://uk.scfcontrolsplatform.app"
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
      "args": ["run", "-i", "--rm", "-e", "SCF_API_KEY", "markac007/mcp-server-scf"],
      "env": {
        "SCF_API_KEY": "scf_your_api_key_here"
      }
    }
  }
}
```

The `-e SCF_API_KEY` flag (without a value) passes the variable through from the client's `env` block into the container — the key itself never appears in the container args list.

---

## Region selection

`SCF_API_URL` selects the platform region. Pick the endpoint that matches where your data is hosted:

| Region | `SCF_API_URL`                                  | Platform console             |
| ------ | ---------------------------------------------- | ---------------------------- |
| UK     | `https://uk.scfcontrolsplatform.app` (default) | `uk.scfcontrolsplatform.app` |
| US     | `https://scfcontrolsplatform.com`              | `scfcontrolsplatform.com`    |

An API key issued in one region **will not work** against the other. Using the wrong URL produces `401 Authentication failed` — the most common cause of a working account reporting auth errors.

---

## Rotation

Platform-side rotation is a two-step process:

1. Generate a new key in **Settings → API Keys**. You'll have two active keys temporarily.
2. Update the `SCF_API_KEY` value in every MCP client config, restart the client, and verify tools work.
3. Revoke the old key from the platform.

There is no automated rotation hook in this server — secrets are expected to live in the MCP client configuration. For Docker deployments, wire the key through a secret manager (AWS Secrets Manager, 1Password, etc.) and inject via `-e` at runtime.

---

## Scopes and permissions

Today there is one key type with full access to any organization the user belongs to; fine-grained scopes are planned but not shipped. Role-based access (`admin`, `editor`, `viewer`) is enforced **per organization membership**, not per key — a `viewer` membership cannot invoke write-tagged tools like `update_scoped_control` or `revalidate_evidence_file` regardless of which key they use. A `403 Access denied` response usually means the authenticated user lacks the required role in the target org.

---

## Security properties

- **Never logged.** `SCF_API_KEY` is never printed to stderr, never included in error messages, never appears in `--debug` output.
- **Server-side hashing.** Keys are stored as SHA-256 hashes; the platform operator cannot retrieve your plaintext key.
- **HTTPS only.** The platform rejects plain HTTP. The client does not support custom CAs.
- **Short-lived mutations.** Pre-signed download URLs returned by `get_evidence_file` expire after 15 minutes.
- **npm provenance.** Every published version is cryptographically linked to its source commit via [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements) issued through GitHub Actions OIDC — no long-lived npm tokens anywhere in the release pipeline.
