<p align="center">
  <a href="https://scfcontrolsplatform.com/">
    <img src="https://raw.githubusercontent.com/MarkAC007/mcp-server-scf/main/docs/assets/banner.png" alt="SCF Controls Platform — MCP server for security compliance, frameworks, and risk management for AI agents. Maintained by ComplianceGenie.io." width="100%">
  </a>
</p>

# mcp-server-scf

<!-- Build & Security -->

[![CI](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/ci.yml)
[![Security](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/security.yml/badge.svg)](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/security.yml)

<!-- Package & License -->

[![npm version](https://img.shields.io/npm/v/mcp-server-scf.svg)](https://www.npmjs.com/package/mcp-server-scf)
[![npm downloads](https://img.shields.io/npm/dm/mcp-server-scf)](https://www.npmjs.com/package/mcp-server-scf)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-green.svg)](https://modelcontextprotocol.io)

<!-- Registries & Marketplaces -->

[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-green)](https://registry.modelcontextprotocol.io/v0/servers?search=scfcontrolsplatform)
[![smithery badge](https://smithery.ai/badge/@MarkAC007/mcp-server-scf)](https://smithery.ai/server/@MarkAC007/mcp-server-scf)

<!-- Tech Stack -->

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js&logoColor=white)

**Security compliance controls, frameworks, and risk management for AI agents.**

Give your AI assistant access to 1,451 SCF security controls, 354+ framework mappings (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR), evidence tracking, risk registers, and vendor risk management — all through the [Model Context Protocol](https://modelcontextprotocol.io).

Built for the **[SCF Controls Platform](https://scfcontrolsplatform.com/)**. Maintained by [ComplianceGenie.io](https://compliancegenie.io).

> Having trouble? → [**docs/troubleshooting.md**](docs/troubleshooting.md) · API key setup → [**docs/authentication.md**](docs/authentication.md) · How it works → [**docs/architecture.md**](docs/architecture.md)

---

## Overview

`mcp-server-scf` connects AI assistants to the [SCF Controls Platform](https://scfcontrolsplatform.com/) via MCP, enabling natural language interaction with your compliance program. Your AI can browse the full SCF control catalog, track implementation progress, manage evidence collection, assess risks, and monitor third-party vendors — all without leaving your editor or chat.

**72 tools** across 8 domains — click through for full parameter tables and example prompts:

| Domain                                           | Tools | Description                                                                           |
| ------------------------------------------------ | ----- | ------------------------------------------------------------------------------------- |
| [Catalog](docs/tools/catalog.md)                 | 6     | Browse 1,451 controls, 354+ frameworks, 5,736 assessment objectives                   |
| [Control Scoping](docs/tools/scoped-controls.md) | 6     | Track implementation status across an 8-state workflow                                |
| [Evidence](docs/tools/evidence.md)               | 19    | Manage evidence collection, validation, maturity scoring, and windowed AI assessments |
| [Risk Management](docs/tools/risk.md)            | 12    | 5x5 risk matrix, risk register, custom risks and control mapping                      |
| [Vendor Risk (TPRM)](docs/tools/vendors.md)      | 7     | Vendor registry, AI-powered security research, DPSIA                                  |
| [Organization](docs/tools/organization.md)       | 7     | Users, orgs, audit trail, work queue, notifications                                   |
| [Capabilities](docs/tools/capabilities.md)       | 9     | KSI capability themes, scorecards, evidence posture, systems inventory                |
| [Webhooks](docs/tools/webhooks.md)               | 6     | Webhook endpoints, delivery logs, secret rotation                                     |

---

## Quick Start

### 1. Get an API key

1. Sign up at [scfcontrolsplatform.com](https://scfcontrolsplatform.com/) (or [eu.scfcontrolsplatform.app](https://eu.scfcontrolsplatform.app) for EU data residency).
2. **Settings → API Keys → Generate New Key.**
3. Copy the key — shown once. Starts with `scf_`.

Full walkthrough (rotation, region selection, scopes): [**docs/authentication.md**](docs/authentication.md).

### 2. Install — one-click

Pick the button for your client. The deeplink opens the relevant IDE/app with a pre-filled install prompt — just paste your key when asked.

[![Install in Claude Desktop](https://img.shields.io/badge/Install-Claude_Desktop-D97757?logo=anthropic&logoColor=white)](claude://mcp/install?name=scf&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-server-scf%22%5D%2C%22env%22%3A%7B%22SCF_API_KEY%22%3A%22scf_your_api_key_here%22%2C%22SCF_API_URL%22%3A%22https%3A%2F%2Feu.scfcontrolsplatform.app%22%7D%7D)
[![Install in Cursor](https://img.shields.io/badge/Install-Cursor-000000?logo=cursor&logoColor=white)](cursor://anysphere.cursor-deeplink/mcp/install?name=scf&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1zZXJ2ZXItc2NmIl0sImVudiI6eyJTQ0ZfQVBJX0tFWSI6InNjZl95b3VyX2FwaV9rZXlfaGVyZSIsIlNDRl9BUElfVVJMIjoiaHR0cHM6Ly9ldS5zY2Zjb250cm9sc3BsYXRmb3JtLmFwcCJ9fQ%3D%3D)
[![Try on Smithery](https://smithery.ai/badge/@MarkAC007/mcp-server-scf)](https://smithery.ai/server/@MarkAC007/mcp-server-scf)

Prefer to edit config by hand, or on a client without a deeplink (Windsurf, Docker)? See **[3. Manual config](#3-manual-config)** below.

### 3. Manual config

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "scf": {
      "command": "npx",
      "args": ["-y", "mcp-server-scf"],
      "env": {
        "SCF_API_KEY": "scf_your_api_key_here",
        "SCF_API_URL": "https://eu.scfcontrolsplatform.app"
      }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add scf -- npx -y mcp-server-scf
export SCF_API_KEY="scf_your_api_key_here"
export SCF_API_URL="https://eu.scfcontrolsplatform.app"
```

**Cursor / Windsurf** — same JSON shape as Claude Desktop in `.cursor/mcp.json` (or the equivalent Windsurf path).

**Docker:**

```json
{
  "mcpServers": {
    "scf": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "SCF_API_KEY", "markac007/mcp-server-scf"],
      "env": { "SCF_API_KEY": "scf_your_api_key_here" }
    }
  }
}
```

---

## Configuration

| Variable      | Required | Default                              | Description                                    |
| ------------- | -------- | ------------------------------------ | ---------------------------------------------- |
| `SCF_API_KEY` | Yes      | —                                    | Your SCF platform API key (starts with `scf_`) |
| `SCF_API_URL` | No       | `https://eu.scfcontrolsplatform.app` | Platform API endpoint                          |

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

- [**docs/authentication.md**](docs/authentication.md) — API key setup, rotation, region selection, scopes.
- [**docs/architecture.md**](docs/architecture.md) — request flow, error model, rate limiting, what the server does and does not do.
- [**docs/troubleshooting.md**](docs/troubleshooting.md) — symptom/cause/fix for the common failure modes.
- [**docs/tools/**](docs/tools/) — per-domain reference with full parameter tables.

---

## Security

- API keys are never logged or included in error messages.
- All communication uses HTTPS; keys are SHA-256 hashed server-side.
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

- [SCF Controls Platform](https://scfcontrolsplatform.com/) — the compliance platform
- [ComplianceGenie.io](https://compliancegenie.io) — maintainer
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP specification
- [SCF Framework](https://securecontrolsframework.com) — Secure Controls Framework
- [npm Package](https://www.npmjs.com/package/mcp-server-scf) — npm registry
- [Changelog](CHANGELOG.md) — release history
