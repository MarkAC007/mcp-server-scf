# mcp-server-scf

<!-- Build & Security -->
[![CI](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/ci.yml)
[![Security](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/security.yml/badge.svg)](https://github.com/MarkAC007/mcp-server-scf/actions/workflows/security.yml)

<!-- Package & License -->
[![npm version](https://img.shields.io/npm/v/mcp-server-scf.svg)](https://www.npmjs.com/package/mcp-server-scf)
[![npm downloads](https://img.shields.io/npm/dm/mcp-server-scf)](https://www.npmjs.com/package/mcp-server-scf)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-green.svg)](https://modelcontextprotocol.io)

<!-- Tech Stack -->
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js&logoColor=white)

**Security compliance controls, frameworks, and risk management for AI agents.**

Give your AI assistant access to 1,451 SCF security controls, 354+ framework mappings (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR), evidence tracking, risk registers, and vendor risk management — all through the [Model Context Protocol](https://modelcontextprotocol.io).

Built and maintained by [ComplianceGenie.io](https://compliancegenie.io) | Platform: [SCF Controls Platform](https://scfcontrolsplatform.com/)

---

## Overview

`mcp-server-scf` connects AI assistants to the [SCF Controls Platform](https://scfcontrolsplatform.com/) via MCP, enabling natural language interaction with your compliance program. Your AI can browse the full SCF control catalog, track implementation progress, manage evidence collection, assess risks, and monitor third-party vendors — all without leaving your editor or chat.

**38 tools** across 7 domains:

| Domain | Tools | Description |
|--------|-------|-------------|
| [Catalog](#catalog-reference-data) | 6 | Browse 1,451 controls, 354+ frameworks, 5,736 assessment objectives |
| [Control Scoping](#control-scoping) | 6 | Track implementation status across an 8-state workflow |
| [Evidence](#evidence-collection) | 4 | Manage evidence collection and maturity scoring |
| [Risk Management](#risk-management) | 5 | 5x5 risk matrix, risk register, severity summaries |
| [Vendor Risk (TPRM)](#vendor-risk-tprm) | 7 | Vendor registry, AI-powered security research, DPSIA |
| [Organization](#organization--platform) | 7 | Users, orgs, audit trail, work queue, notifications |
| [Capabilities](#capabilities--systems) | 4 | KSI capability themes, systems inventory |

---

## Quick Start

### Getting an API Key

1. Sign up at [scfcontrolsplatform.com](https://scfcontrolsplatform.com/)
2. Go to **Settings > API Keys**
3. Click **Generate New Key**
4. Copy the key (shown once) — it starts with `scf_`

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SCF_API_KEY` | Yes | — | Your SCF platform API key (starts with `scf_`) |
| `SCF_API_URL` | No | `https://eu.scfcontrolsplatform.app` | Platform API endpoint |

---

## Tools

### Catalog (Reference Data)

Read-only access to the full SCF control catalog — 1,451 controls, 354+ frameworks, 272 evidence types, and 5,736 assessment objectives.

#### `list_controls`

List SCF security controls with search, domain, and framework filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by control title or description |
| `domain` | string | No | Filter by domain identifier (e.g., `GOV`, `AST`, `IAC`) |
| `framework` | string | No | Filter by framework (e.g., `nist-800-53`, `iso-27001`) |
| `limit` | number | No | Results to return (default: 25, max: 100) |
| `offset` | number | No | Results to skip for pagination (default: 0) |

#### `get_control`

Get detailed information about a specific SCF control including description, mapped frameworks, assessment objectives, and linked evidence items.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scf_id` | string | Yes | SCF control identifier (e.g., `AST-01`, `IAC-15`, `GOV-02`) |

#### `list_frameworks`

List all 354+ compliance frameworks mapped in the SCF catalog (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR, and more).

*No parameters.*

#### `list_domains`

List all compliance domains in the SCF taxonomy. Domains group related security controls (e.g., GOV = Governance, AST = Asset Management, IAC = Identity & Access Control).

*No parameters.*

#### `list_evidence_catalog`

List the 272 standard evidence types from the SCF reference catalog that can be collected to demonstrate control implementation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by evidence title or description |
| `limit` | number | No | Results to return (default: 25, max: 100) |
| `offset` | number | No | Results to skip for pagination (default: 0) |

#### `list_assessment_objectives`

List the 5,736 assessment test criteria used to evaluate control implementation. Can filter by specific control ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `control_id` | string | No | Filter by SCF control ID (e.g., `GOV-01`, `AST-02`) |
| `search` | string | No | Search term to filter objectives |
| `limit` | number | No | Results to return (default: 25, max: 100) |
| `offset` | number | No | Results to skip for pagination (default: 0) |

---

### Control Scoping

Track implementation status of controls scoped to your organization. Supports an 8-state workflow: `not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred`.

#### `list_scoped_controls`

List controls scoped to your organization with implementation status. Supports filtering by status, domain, framework, and search.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) — use `list_organizations` to find |
| `scope_status` | string | No | Filter by status: `not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred` |
| `domain` | string | No | Filter by SCF domain (e.g., `GOV`, `AST`, `IAC`) |
| `framework` | string | No | Filter by framework |
| `search` | string | No | Search by control ID or title |
| `limit` | number | No | Results to return (default: 25, max: 100) |
| `offset` | number | No | Results to skip for pagination (default: 0) |

#### `get_scoped_control`

Get detailed implementation status of a specific scoped control, including owner, notes, evidence links, and audit history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `scf_id` | string | Yes | SCF control identifier (e.g., `AST-01`, `GOV-02`) |

#### `update_scoped_control`

Update a scoped control's implementation tracking fields. Only provided fields are updated.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `scf_id` | string | Yes | SCF control identifier (e.g., `AST-01`, `GOV-02`) |
| `implementation_status` | string | No | New status (lowercase): `not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred` |
| `priority` | string | No | Priority: `high`, `medium`, `low` |
| `maturity_level` | string | No | Control maturity level |
| `owner` | string | No | Control owner (person accountable) |
| `assigned_to` | string | No | Assignee (person responsible for implementation) |
| `implementation_notes` | string | No | Implementation notes and context |
| `target_date` | string | No | Target completion date (`YYYY-MM-DD`) |
| `completion_date` | string | No | Actual completion date (`YYYY-MM-DD`) |
| `selection_reason` | string | No | Justification for status (required for `not_applicable`, `deferred`) |

#### `get_scoping_stats`

Get implementation statistics — counts by status, completion percentage, and framework coverage breakdown.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `scope_framework`

Bulk-scope all controls from a framework to your organization. Creates scoped control entries for every control in the selected framework.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `framework_id` | string | Yes | Framework ID to scope (e.g., `nist-800-53-r5`) |

#### `batch_update_controls`

Batch update up to 500 scoped controls in a single transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `operations` | array | Yes | Array of update operations (max 500). Each operation: |

Each operation in the `operations` array accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scf_id` | string | Yes | SCF control identifier (e.g., `AST-01`) |
| `selected` | boolean | No | Whether the control is in scope |
| `implementation_status` | string | No | Implementation status (lowercase) |
| `selection_reason` | string | No | Justification for selection or status |
| `priority` | string | No | Implementation priority |
| `owner` | string | No | Control owner |
| `assigned_to` | string | No | Assignee |
| `maturity_level` | string | No | Control maturity level |
| `target_date` | string | No | Target date (`YYYY-MM-DD`) |
| `completion_date` | string | No | Completion date (`YYYY-MM-DD`) |
| `implementation_notes` | string | No | Implementation notes |

---

### Evidence Collection

Track evidence artifacts that demonstrate control implementation for audit readiness.

#### `list_evidence`

List evidence items tracked for an organization's controls.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `system_id` | string | No | Filter by system ID |

#### `create_evidence`

Create a new evidence item linked to a control.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `title` | string | Yes | Evidence title |
| `control_id` | string | No | Scoped control ID to link evidence to |
| `description` | string | No | Evidence description |
| `evidence_type` | string | No | Type: `document`, `screenshot`, `log`, etc. |

#### `get_evidence_maturity`

Get evidence maturity summary — average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `list_evidence_tasks`

List evidence collection tasks — the work queue for gathering evidence. Shows what needs to be collected, by whom, and by when.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | No | Organization ID (UUID) |
| `assignee` | string | No | Filter by assigned user |
| `status` | string | No | Filter by task status |

---

### Risk Management

5x5 risk matrix with inherent and residual scoring, treatment tracking, and severity summaries.

#### `list_risks`

List risk assessments in the organization's risk register.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `status` | string | No | Filter by treatment status |
| `page` | number | No | Page number (default: 1) |
| `per_page` | number | No | Results per page (default: 25, max: 100) |

#### `get_risk`

Get detailed risk assessment including inherent and residual scores, treatment plan, owner, and review date.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `risk_id` | string | Yes | Risk assessment ID |

#### `create_risk`

Create a new risk assessment in the 5x5 risk matrix.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `title` | string | Yes | Risk title |
| `description` | string | Yes | Risk description |
| `likelihood` | number | Yes | Inherent likelihood (1-5) |
| `impact` | number | Yes | Inherent impact (1-5) |
| `owner` | string | No | Risk owner |
| `treatment_status` | string | No | Treatment: `mitigate`, `accept`, `transfer`, `avoid` |
| `control_id` | string | No | Linked control ID |

#### `get_risk_matrix`

Get the 5x5 risk matrix visualization data showing risk distribution across likelihood and impact.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `get_risk_summary`

Get aggregated risk summary — total risks by severity, treatment status breakdown, and trend data.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

---

### Vendor Risk (TPRM)

Third-party risk management with AI-powered security research, breach detection, and data protection impact assessments.

#### `list_vendors`

List vendors in the TPRM registry with status and criticality filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `status` | string | No | Filter: `active`, `inactive`, `under_review` |
| `criticality` | string | No | Filter: `critical`, `high`, `medium`, `low` |
| `page` | number | No | Page number (default: 1) |
| `per_page` | number | No | Results per page (default: 25, max: 100) |

#### `get_vendor`

Get detailed vendor information including certifications, assessments, risk score, and research results.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `vendor_id` | string | Yes | Vendor ID |

#### `create_vendor`

Add a new vendor to the TPRM registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `name` | string | Yes | Vendor name |
| `description` | string | No | Vendor description |
| `category` | string | No | Category: `SaaS`, `Infrastructure`, `Consulting`, etc. |
| `criticality` | string | No | Criticality: `critical`, `high`, `medium` (default), `low` |
| `website` | string | No | Vendor website URL |
| `contact_email` | string | No | Primary contact email |

#### `trigger_vendor_research`

Trigger AI-powered security research for a vendor — checks HIBP (breach databases), NVD (vulnerability databases), and public security posture.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `vendor_id` | string | Yes | Vendor ID |

#### `get_vendor_research`

Get the latest AI-powered research results for a vendor, including breach history, known vulnerabilities, and security posture analysis.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `vendor_id` | string | Yes | Vendor ID |

#### `trigger_dpsia`

Trigger a Data Protection Security Impact Assessment (DPSIA) for a vendor. Evaluates security posture against CIA triad and certification requirements.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `vendor_id` | string | Yes | Vendor ID |

---

### Organization & Platform

User management, audit trail, work queue, and notifications.

#### `get_current_user`

Get the current authenticated user's profile, including name, email, organizations, and role.

*No parameters.*

#### `list_organizations`

List organizations the current user has access to. Returns org ID, name, tier, and member count.

*No parameters.*

#### `get_organization`

Get detailed organization information including subscription tier, member count, usage limits, and settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `list_members`

List members of an organization with their roles (`admin`, `editor`, `viewer`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `get_work_queue`

Get the authenticated user's prioritized work queue — pending tasks, assignments, and action items across all organizations.

*No parameters.*

#### `get_audit_log`

Get the field-level audit trail for an organization. Shows changes to controls, evidence, and other entities with actor, timestamp, and before/after values.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `limit` | number | No | Results to return (default: 50, max: 100) |
| `offset` | number | No | Results to skip for pagination (default: 0) |

#### `get_notifications`

Get notifications for the current user — new assignments, comments, status changes, and system alerts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unread_only` | boolean | No | Only return unread notifications (default: false) |
| `limit` | number | No | Notifications to return (default: 25, max: 100) |

---

### Capabilities & Systems

KSI-aligned capability themes and infrastructure systems inventory.

#### `list_capability_themes`

List the 11 KSI-aligned capability themes for an organization. Capability themes group NIST 800-53 controls into security capability areas.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `list_capabilities`

List security capabilities mapped to systems and evidence, showing what security functions your infrastructure supports.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `list_systems`

List infrastructure systems in the organization's inventory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |

#### `create_system`

Add a system to the organization's infrastructure inventory. Systems can be linked to capabilities and evidence.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_id` | string | Yes | Organization ID (UUID) |
| `name` | string | Yes | System name |
| `system_type` | string | Yes | Type: `cloud_provider`, `identity_provider`, `ticketing`, `logging`, `security_tool`, `code_repository`, `document_management`, `custom` |
| `description` | string | No | System description |
| `status` | string | No | Status: `active` (default), `inactive`, `deprecated` |

---

## Example Prompts

Once connected, try asking your AI assistant:

- "What NIST 800-53 controls apply to access control?"
- "Show me my organization's control implementation progress"
- "List all critical vendors and their risk scores"
- "Create a risk assessment for our cloud migration"
- "What evidence do I need to collect for SOC 2 audit?"
- "Show the 5x5 risk matrix for my organization"
- "Scope the ISO 27001 framework for my org"
- "Batch update all access control controls to in_progress"
- "What's in my compliance work queue today?"
- "Run a DPSIA on our cloud provider vendor"

---

## Security

- API keys are never logged or included in error messages
- All communication uses HTTPS
- Keys are SHA-256 hashed server-side
- Rate limiting: 100 req/min (read), 20 req/min (write)
- Multi-tenant: all operations scoped to your organization
- npm package published with [provenance attestation](https://docs.npmjs.com/generating-provenance-statements) via OIDC trusted publishing
- CI includes Gitleaks secret detection, CodeQL analysis, and Semgrep SAST

---

## Architecture

```
src/
├── index.ts              # Server entry point (stdio transport)
├── tools/
│   ├── catalog.ts        # SCF reference data (read-only, 6 tools)
│   ├── scoped-controls.ts # Control implementation tracking (6 tools)
│   ├── evidence.ts       # Evidence collection (4 tools)
│   ├── risk.ts           # Risk register (5 tools)
│   ├── vendors.ts        # Third-party risk management (7 tools)
│   ├── organization.ts   # Org, users, audit, notifications (7 tools)
│   └── capabilities.ts   # KSI themes, systems (4 tools)
└── lib/
    ├── api-client.ts     # HTTP client with auth
    └── errors.ts         # Structured error handling
```

---

## Development

```bash
git clone https://github.com/MarkAC007/mcp-server-scf.git
cd mcp-server-scf
npm install
npm run build
npm run dev        # Watch mode
npm run lint       # ESLint
```

### Testing with MCP Inspector

```bash
SCF_API_KEY=scf_your_key npx @modelcontextprotocol/inspector node build/index.js
```

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT - see [LICENSE](LICENSE)

---

## Links

- [SCF Controls Platform](https://scfcontrolsplatform.com/) — The compliance platform
- [ComplianceGenie.io](https://compliancegenie.io) — Maintained by Compliance Genie
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP specification
- [SCF Framework](https://securecontrolsframework.com) — Secure Controls Framework
- [npm Package](https://www.npmjs.com/package/mcp-server-scf) — npm registry
- [Changelog](CHANGELOG.md) — Release history
