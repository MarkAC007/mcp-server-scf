<p align="center">
  <a href="https://scfcontrolsplatform.com/">
    <img src="https://raw.githubusercontent.com/MarkAC007/mcp-server-scf/main/docs/assets/banner.png" alt="SCF Controls Platform — MCP server for security compliance, frameworks, and risk management for AI agents. Maintained by ComplianceGenie.io." width="100%">
  </a>
</p>

# mcp-server-scf

<!-- Build & Security -->

[![CI](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/ci.yml)
[![Security](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/security.yml/badge.svg)](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/MarkAC007/mcp-server-scf/badge)](https://scorecard.dev/viewer/?uri=github.com/MarkAC007/mcp-server-scf)
[![Socket.dev](https://socket.dev/api/badge/npm/package/mcp-server-scf)](https://socket.dev/npm/package/mcp-server-scf)

<!-- Package & License -->

[![npm version](https://img.shields.io/npm/v/mcp-server-scf.svg)](https://www.npmjs.com/package/mcp-server-scf)
[![npm downloads](https://img.shields.io/npm/dm/mcp-server-scf)](https://www.npmjs.com/package/mcp-server-scf)
[![install size](https://img.shields.io/packagephobia/install/mcp-server-scf)](https://packagephobia.com/result?p=mcp-server-scf)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-green.svg)](https://modelcontextprotocol.io)

<!-- Registries & Marketplaces -->

[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-green)](https://registry.modelcontextprotocol.io/v0/servers?search=scfcontrolsplatform)
[![smithery badge](https://smithery.ai/badge/@MarkAC007/mcp-server-scf)](https://smithery.ai/server/@MarkAC007/mcp-server-scf)

<!-- Tech Stack -->

![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=node.js&logoColor=white)

**Security compliance controls, frameworks, and risk management for AI agents.**

Give your AI assistant access to 1,451 SCF security controls, 354+ framework mappings (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR), evidence tracking, risk registers, and vendor risk management — all through the [Model Context Protocol](https://modelcontextprotocol.io).

Built for the **[SCF Controls Platform](https://scfcontrolsplatform.com/)**. Maintained by [ComplianceGenie.io](https://compliancegenie.io).

> 🆕 **The platform is now open-source, self-hosted software.** The SCF Controls Platform — SCF-native GRC tooling for the free Secure Controls Framework content — is published under AGPL-3.0 at **[scf-controls-platform-oss](https://github.com/MarkAC007/scf-controls-platform-oss)**. Companies download and host it themselves via Docker Compose.

> Having trouble? → [**docs/troubleshooting.md**](docs/troubleshooting.md) · API key setup → [**docs/authentication.md**](docs/authentication.md) · How it works → [**docs/architecture.md**](docs/architecture.md)

---

## Overview

`mcp-server-scf` connects AI assistants to the [SCF Controls Platform](https://scfcontrolsplatform.com/) via MCP, enabling natural language interaction with your compliance program. Your AI can browse the full SCF control catalog, track implementation progress, manage evidence collection, assess risks, and monitor third-party vendors — all without leaving your editor or chat.

**88 tools** across 8 domains — click through for full parameter tables and example prompts:

| Domain                                           | Tools | Description                                                                                                      |
| ------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------- |
| [Catalog](docs/tools/catalog.md)                 | 6     | Browse 1,451 controls, 354+ frameworks, 5,736 assessment objectives                                              |
| [Control Scoping](docs/tools/scoped-controls.md) | 6     | Track implementation status across an 8-state workflow                                                           |
| [Evidence](docs/tools/evidence.md)               | 26    | Manage evidence collection, validation, maturity scoring, windowed AI assessments, and control-composite rollups |
| [Risk Management](docs/tools/risk.md)            | 12    | 5x5 risk matrix, risk register, custom risks and control mapping                                                 |
| [Vendor Risk (TPRM)](docs/tools/vendors.md)      | 11    | Vendor registry, AI security research, async AI assessments (replaces DPSIA)                                     |
| [Organization](docs/tools/organization.md)       | 7     | Users, orgs, audit trail, work queue, notifications                                                              |
| [Capabilities](docs/tools/capabilities.md)       | 14    | KSI themes, scorecards, evidence posture, systems inventory, system catalog + AI recipes                         |
| [Webhooks](docs/tools/webhooks.md)               | 6     | Webhook endpoints, delivery logs, secret rotation                                                                |

---

## Try it with MCP Inspector

Kick the tires without adding the server to a client — [MCP Inspector](https://github.com/modelcontextprotocol/inspector) launches a local UI that introspects every tool, its schema, and its description:

```bash
npx @modelcontextprotocol/inspector npx -y mcp-server-scf
```

Inspector opens on `http://localhost:6274` and connects to `mcp-server-scf` over stdio. You'll see all 88 tools, grouped by domain, with their Zod schemas rendered as a live form.

Live tool calls need your instance's URL and an API key — export `SCF_API_URL` and `SCF_API_KEY` in the same shell before launching Inspector, or set them under the "Environment Variables" tab inside the Inspector UI. Without them, you can still browse schemas and descriptions; tool calls return a configuration error.

---

## Quick Start

### 1. Self-host the platform & get an API key

The SCF Controls Platform is **open-source software you host yourself** — there is no sign-up. Deploy it from [scf-controls-platform-oss](https://github.com/MarkAC007/scf-controls-platform-oss) (a Docker Compose stack with bundled PostgreSQL, Redis, and MinIO), then:

1. Set an `API_KEY` in the platform's `.env` (generate one with `openssl rand -hex 32`), or create a key in **Settings → API Keys** once the app is running.
2. Note your instance's API URL — `http://localhost:8000` by default, or your deployed host.

Use that key as `SCF_API_KEY` and the instance URL as `SCF_API_URL` (see [Configuration](#configuration)).

### 2. Install — one-click

Pick the route for your client.

**Claude Desktop** — the one-click path is the signed **[.mcpb Desktop Extension](#claude-desktop-extension-mcpb)** below. Claude Desktop does not register a custom URL scheme, so there is no clickable deeplink; instead you drag the `.mcpb` onto **Settings → Extensions** and paste your API key once. See [anthropics/claude-code#26952](https://github.com/anthropics/claude-code/issues/26952) for the upstream tracking issue.

**Cursor** — click the badge below. Cursor registers the `cursor://` scheme, so the deeplink opens the IDE with the server config pre-filled:

[![Install in Cursor](https://img.shields.io/badge/Install-Cursor-000000?logo=cursor&logoColor=white)](cursor://anysphere.cursor-deeplink/mcp/install?name=scf&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1zZXJ2ZXItc2NmIl0sImVudiI6eyJTQ0ZfQVBJX0tFWSI6InNjZl95b3VyX2FwaV9rZXlfaGVyZSIsIlNDRl9BUElfVVJMIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwIn19)

After install, edit the pre-filled `SCF_API_URL` to point at **your** instance — there is no hosted default.

**Smithery** — managed hosted deployment:

[![Try on Smithery](https://smithery.ai/badge/@MarkAC007/mcp-server-scf)](https://smithery.ai/server/@MarkAC007/mcp-server-scf)

Prefer to edit config by hand, or on a client without a deeplink (Windsurf, Docker)? See **[3. Manual config](#3-manual-config)** below.

### Claude Desktop Extension (.mcpb)

For Claude Desktop ≥ 0.11.0, the easiest install is a signed `.mcpb` bundle — no JSON editing, no `npx` runtime, no Node required on the host:

1. Download `mcp-server-scf-<version>.mcpb` from the [latest GitHub release](https://github.com/MarkAC007/mcp-server-scf/releases/latest).
2. Double-click the file (or drag it onto Claude Desktop → **Settings → Extensions**).
3. When prompted, paste your `scf_…` API key. It's stored in your OS keychain, not in a config file.
4. Claude Desktop restarts the server and all 88 tools are available.

To uninstall or update the API key later: **Settings → Extensions → SCF Controls Platform → Configure**.

### 3. Manual config

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "scf": {
      "command": "npx",
      "args": ["-y", "mcp-server-scf"],
      "env": {
        "SCF_API_KEY": "your_api_key_here",
        "SCF_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add scf -- npx -y mcp-server-scf
export SCF_API_KEY="your_api_key_here"
export SCF_API_URL="http://localhost:8000"
```

**Cursor / Windsurf** — same JSON shape as Claude Desktop in `.cursor/mcp.json` (or the equivalent Windsurf path).

**Docker:**

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

---

## Configuration

| Variable      | Required | Default | Description                                                                                                        |
| ------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `SCF_API_KEY` | Yes      | —       | API key from your self-hosted platform instance                                                                    |
| `SCF_API_URL` | Yes      | —       | Base URL of your self-hosted platform (e.g. `http://localhost:8000`). The former hosted default is decommissioned. |

---

## Example Prompts

Once connected, try asking your AI assistant:

- "What NIST 800-53 controls apply to access control?"
- "Show me my organization's control implementation progress."
- "List all critical vendors and their risk scores."
- "Create a risk assessment for our cloud migration."
- "What evidence do I need to collect for SOC 2 audit?"
- "Show the 5x5 risk matrix for my organization."
- "Run a DPSIA on our cloud provider vendor."

More examples live in each per-domain doc under [`docs/tools/`](docs/tools/).

---

## Documentation

- [**docs/authentication.md**](docs/authentication.md) — API key setup, rotation, self-hosted URL configuration, scopes.
- [**docs/architecture.md**](docs/architecture.md) — request flow, error model, rate limiting, what the server does and does not do.
- [**docs/troubleshooting.md**](docs/troubleshooting.md) — symptom/cause/fix for the common failure modes.
- [**docs/tools/**](docs/tools/) — per-domain reference with full parameter tables.

---

## Security

- API keys are never logged or included in error messages.
- Keys are SHA-256 hashed server-side. Use HTTPS for any instance reachable beyond localhost.
- Rate limiting: 100 req/min read, 20 req/min write.
- Multi-tenant — all operations scoped to your organization.
- npm package published with [provenance attestation](https://docs.npmjs.com/generating-provenance-statements) via OIDC trusted publishing.
- CI includes Gitleaks secret detection, CodeQL analysis, and Semgrep SAST.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

---

## Development

```bash
git clone https://github.com/MarkAC007/mcp-server-scf.git
cd mcp-server-scf
npm install
npm run build
npm run dev        # Watch mode
npm run lint       # ESLint
npm test           # Vitest
```

### Testing with MCP Inspector

```bash
SCF_API_KEY=scf_your_key npx @modelcontextprotocol/inspector node build/index.js
```

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE).

---

## Links

- [scf-controls-platform-oss](https://github.com/MarkAC007/scf-controls-platform-oss) — the open-source, self-hosted platform (AGPL-3.0)
- [ComplianceGenie.io](https://compliancegenie.io) — maintainer
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP specification
- [SCF Framework](https://securecontrolsframework.com) — Secure Controls Framework
- [npm Package](https://www.npmjs.com/package/mcp-server-scf) — npm registry
- [Changelog](CHANGELOG.md) — release history
