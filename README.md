# mcp-server-scf

[![npm version](https://img.shields.io/npm/v/mcp-server-scf.svg)](https://www.npmjs.com/package/mcp-server-scf)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-green.svg)](https://modelcontextprotocol.io)

**Security compliance controls, frameworks, and risk management for AI agents.**

Give your AI assistant access to 1,451 SCF security controls, 354+ framework mappings (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR), evidence tracking, risk registers, and vendor risk management — all through the [Model Context Protocol](https://modelcontextprotocol.io).

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Claude Code

```bash
claude mcp add scf -- npx -y mcp-server-scf
```

Then set environment variables in your shell:

```bash
export SCF_API_KEY="scf_your_api_key_here"
export SCF_API_URL="https://eu.scfcontrolsplatform.app"
```

### Cursor / Windsurf

Add to your MCP config (`.cursor/mcp.json` or equivalent):

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

## Getting an API Key

1. Sign up at [scfcontrolsplatform.app](https://eu.scfcontrolsplatform.app)
2. Go to **Settings > API Keys**
3. Click **Generate New Key**
4. Copy the key (shown once) and add it to your MCP config

## Tools

### Catalog (Read-Only Reference Data)

| Tool | Description |
|------|-------------|
| `list_controls` | List SCF security controls with search, domain, and framework filters |
| `get_control` | Get control details with assessment objectives and evidence items |
| `list_frameworks` | List all 354+ mapped compliance frameworks |
| `list_domains` | List compliance domains (Asset Management, IAC, etc.) |
| `list_evidence_catalog` | List 272 standard evidence types |
| `list_assessment_objectives` | List 5,736 assessment test criteria |

### Control Scoping (Implementation Tracking)

| Tool | Description |
|------|-------------|
| `list_scoped_controls` | List controls scoped to your org with implementation status |
| `get_scoped_control` | Get detailed implementation status, owner, and audit history |
| `update_scoped_control` | Update status, owner, or notes (validated state transitions) |
| `get_scoping_stats` | Implementation progress — counts by status, completion % |
| `scope_framework` | Bulk-scope all controls from a framework |
| `batch_update_controls` | Batch update up to 500 controls in one transaction |

### Evidence Collection

| Tool | Description |
|------|-------------|
| `list_evidence` | List evidence items tracked for controls |
| `create_evidence` | Create evidence linked to a control |
| `get_evidence_maturity` | Evidence maturity scores across controls |
| `list_evidence_tasks` | Evidence collection work queue |

### Risk Management

| Tool | Description |
|------|-------------|
| `list_risks` | List risk register entries with scores and treatment status |
| `get_risk` | Get detailed risk assessment (inherent + residual scores) |
| `create_risk` | Create risk in the 5x5 matrix with likelihood and impact |
| `get_risk_matrix` | 5x5 risk matrix visualization data |
| `get_risk_summary` | Aggregated risk summary by severity |

### Vendor Risk (TPRM)

| Tool | Description |
|------|-------------|
| `list_vendors` | List vendors with status and criticality filters |
| `get_vendor` | Get vendor details, certs, assessments, and risk scores |
| `create_vendor` | Add vendor to TPRM registry |
| `trigger_vendor_research` | AI-powered security research (HIBP, NVD, breach history) |
| `get_vendor_research` | Get latest vendor research results |
| `trigger_dpsia` | Data Protection Security Impact Assessment |

### Organization & Platform

| Tool | Description |
|------|-------------|
| `get_current_user` | Current user profile and organizations |
| `list_organizations` | Organizations you have access to |
| `get_organization` | Org details, tier, usage, and settings |
| `list_members` | Organization members and roles |
| `get_work_queue` | Your prioritized task queue |
| `get_audit_log` | Field-level change audit trail (SOC 2) |
| `get_notifications` | User notifications and alerts |

### Capabilities & Systems

| Tool | Description |
|------|-------------|
| `list_capability_themes` | 11 KSI-aligned capability themes |
| `list_capabilities` | Security capabilities mapped to systems |
| `list_systems` | Infrastructure systems inventory |
| `create_system` | Add system to inventory |

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SCF_API_KEY` | Yes | — | Your SCF platform API key (`scf_` prefix) |
| `SCF_API_URL` | No | `https://eu.scfcontrolsplatform.app` | Platform API URL |

## Example Prompts

Once connected, try asking your AI assistant:

- "What NIST 800-53 controls apply to access control?"
- "Show me my organization's control implementation progress"
- "List all critical vendors and their risk scores"
- "Create a risk assessment for our cloud migration"
- "What evidence do I need to collect for SOC 2 audit?"
- "Show the 5x5 risk matrix for my organization"
- "What's in my compliance work queue today?"

## Architecture

```
mcp-server-scf
├── src/
│   ├── index.ts              # Server entry point (stdio transport)
│   ├── tools/
│   │   ├── catalog.ts        # SCF reference data (read-only)
│   │   ├── scoped-controls.ts # Control implementation tracking
│   │   ├── evidence.ts       # Evidence collection
│   │   ├── risk.ts           # Risk register
│   │   ├── vendors.ts        # Third-party risk management
│   │   ├── organization.ts   # Org, users, audit, notifications
│   │   └── capabilities.ts   # KSI themes, systems
│   └── lib/
│       ├── api-client.ts     # HTTP client with auth
│       └── errors.ts         # Structured error handling
├── build/                    # Compiled output
├── package.json
└── tsconfig.json
```

## Development

```bash
# Clone
git clone https://github.com/MarkAC007/mcp-server-scf.git
cd mcp-server-scf

# Install
npm install

# Build
npm run build

# Development (watch mode)
npm run dev

# Test with MCP Inspector
npm run inspector
```

## Testing with MCP Inspector

```bash
SCF_API_KEY=scf_your_key npx @modelcontextprotocol/inspector node build/index.js
```

## Security

- API keys are never logged or included in error messages
- All communication uses HTTPS
- Keys are SHA-256 hashed server-side
- Rate limiting: 100 req/min (read), 20 req/min (write)
- Multi-tenant: All operations scoped to your organization

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT - see [LICENSE](LICENSE)

## Links

- [SCF Controls Platform](https://eu.scfcontrolsplatform.app) - The compliance platform
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [SCF Framework](https://securecontrolsframework.com) - Secure Controls Framework
