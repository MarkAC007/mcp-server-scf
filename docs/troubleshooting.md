# Troubleshooting

Common failure modes for `mcp-server-scf`, each as a **symptom → cause → fix** triplet. If nothing here matches, capture a verbose stderr log (see the last section) and open a bug report using the issue template.

---

## Invalid API key / 401

**Symptom**
Every tool call returns `Authentication failed. Check your SCF_API_KEY.` or the MCP client surfaces a `401 Unauthorized`.

**Cause**
One of:

- The key is missing, truncated, or has a stray newline.
- The key belongs to a different region than `SCF_API_URL` points at.
- The key was revoked or rotated server-side.
- The key doesn't start with `scf_` — likely a UUID copy-paste mistake.

**Fix**

1. Confirm the key begins with `scf_` and has no whitespace:
   ```bash
   echo -n "$SCF_API_KEY" | head -c 4   # should print: scf_
   echo -n "$SCF_API_KEY" | wc -c       # should match the length shown at generation time
   ```
2. Verify the region matches — see [Region selection](#region-selection) below.
3. Generate a new key in **Settings → API Keys** and update every MCP client config, then restart the client.
4. If the key works in `curl` but not in the MCP client, the client isn't passing the `env` block through — see [Claude Desktop config](#claude-desktop-config-path-per-os).

---

## Region selection: UK vs US

**Symptom**
Key looks correct (starts with `scf_`, length matches) but every request returns `401`.

**Cause**
API keys are region-scoped. A key minted on `uk.scfcontrolsplatform.app` will not authenticate against `scfcontrolsplatform.com` (US) and vice versa.

**Fix**
Set `SCF_API_URL` to match the region where the key was issued:

| Region | `SCF_API_URL`                                  |
| ------ | ---------------------------------------------- |
| UK     | `https://uk.scfcontrolsplatform.app` (default) |
| US     | `https://scfcontrolsplatform.com`              |

If you're unsure, log into the platform console — the domain in the browser tells you the region.

---

## Rate limits (429)

**Symptom**
After a burst of tool calls, you get `Rate limited. Please wait before retrying.`

**Cause**
The platform enforces **100 read requests/min and 20 write requests/min per API key**. The MCP server has no built-in retry/backoff.

**Fix**

- For bulk work, use the batch tools — `batch_update_controls` (up to 500 operations), `bulk_assess_evidence` (up to 50 files), `bulk_assess_windows` (up to 25 evidence IDs). They count as a single request.
- If you're looping `update_scoped_control` in a script, wait 60 seconds or switch to `batch_update_controls`.
- Persistent 429s on modest traffic suggest a second process is sharing the key — rotate and investigate.

---

## Claude Desktop config path per OS

**Symptom**
You edited a config file but the server doesn't appear in Claude Desktop's MCP status bar, or edits don't take effect after restart.

**Cause**
Wrong path, or JSON syntax error. Claude Desktop silently ignores malformed config and doesn't always surface a clear error.

**Fix**

1. Confirm the exact path:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`
2. Validate the JSON:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
   ```
3. Fully quit Claude Desktop (Cmd-Q / right-click → Quit — closing the window is not enough) and relaunch.
4. Common syntax pitfalls:
   - Trailing commas after the last object key (not allowed in JSON).
   - Unescaped backslashes in Windows paths — use forward slashes or double-backslashes.
   - `env` values must be strings — wrap numbers in quotes.

---

## Claude Code vs `npx` caching

**Symptom**
`npm` published a new version but Claude Code keeps running the old one.

**Cause**
`npx -y mcp-server-scf` downloads to a per-user cache (`~/.npm/_npx/…`) and reuses it until the version on disk is older than the latest registry version. With no version pin, the resolution is fast but can lag by one version if npm's metadata is cached.

**Fix**

- Force the latest: `npx -y mcp-server-scf@latest`.
- Clear the npx cache once: `rm -rf ~/.npm/_npx` then restart the MCP client.
- Pin a specific version in config: `"args": ["-y", "mcp-server-scf@0.6.0"]`.

---

## Cursor / Windsurf config quirks

**Symptom**
The server works in Claude Desktop but not in Cursor or Windsurf.

**Cause**
These clients use slightly different config schemas and tend to validate strictly:

- Cursor expects `.cursor/mcp.json` at the workspace root for project-scoped servers, or `~/.cursor/mcp.json` for user-scoped.
- Windsurf uses `~/.codeium/windsurf/mcp_config.json`.
- Both run the server with a much more restricted PATH than a login shell — `npx` may not be found.

**Fix**

1. Use an absolute `command` path:
   ```json
   "command": "/opt/homebrew/bin/npx"
   ```
2. Match the exact key casing expected — `mcpServers` (camelCase), not `mcp_servers`.
3. Restart the IDE after any config change.
4. Check the IDE's developer console / log viewer for stderr from the server.

---

## Node version / ESM gotchas

**Symptom**
Server exits immediately with `SyntaxError: Cannot use import statement outside a module` or `ERR_UNKNOWN_FILE_EXTENSION`.

**Cause**
Node < 18 doesn't support the ESM features this package relies on, and the shipped binary uses `.js` extensions with an explicit `"type": "module"` in package.json.

**Fix**

1. Upgrade to Node 18 LTS or newer:
   ```bash
   node --version   # must be v18.x or above
   ```
2. If you're using a version manager (`nvm`, `fnm`, `volta`), make sure the MCP client inherits the right version. Claude Desktop launches with whatever `node` is first on the system PATH — not your shell's PATH. Fix by:
   - Symlinking the right binary into `/usr/local/bin/node`, or
   - Using an absolute path in the client config: `"command": "/Users/you/.nvm/versions/node/v20.11.1/bin/npx"`.
3. Avoid Node 19 — it's not an LTS line and some MCP SDK features regressed there. Prefer 18, 20, or 22.

---

## Capturing verbose logs for bug reports

**Symptom**
Something is broken, and you need to send logs with your issue — but the output looks empty.

**Cause**
The server never writes to stdout (that would corrupt the MCP protocol). All diagnostics go to stderr, which most MCP clients swallow by default.

**Fix**

**Claude Desktop:**

```bash
tail -f ~/Library/Logs/Claude/mcp-server-scf.log          # macOS
# or
tail -f "$APPDATA\Claude\logs\mcp-server-scf.log"         # Windows
```

**Claude Code:**

```bash
claude mcp logs scf
```

**Cursor / Windsurf:** open the IDE's developer console (View → Toggle Developer Tools → Console).

**MCP Inspector (recommended for reproducing bugs):**

```bash
SCF_API_KEY=scf_your_key npx @modelcontextprotocol/inspector node build/index.js
```

The Inspector shows every tool call's request, response, and stderr output side-by-side — the fastest way to capture a clean repro.

**Redaction.** Before pasting logs into an issue, run them through a filter to strip the key:

```bash
sed -E 's/scf_[A-Za-z0-9_-]+/scf_REDACTED/g' mcp-server-scf.log
```

The bug report template includes a mandatory "I have redacted API keys, tokens, and PII" checkbox for exactly this reason.
