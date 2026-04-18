# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `get_capability_theme_scorecard` tool — multi-axis KSI scorecard for all capability themes in a single call. Returns per-theme Implementation Coverage, Maturity, Evidence Coverage, Evidence Quality, and composite KSI Posture Score (KPS) with Strong/Moderate/Developing bands. Wraps `GET /organizations/{org_id}/capability-themes/scorecard` (scf-controls-platform #549 Phase 1).
- `get_capability_theme` tool — single capability theme (KSI) with full posture, multi-axis scores, bands, and legacy `posture_percentage`. Wraps `GET /organizations/{org_id}/capability-themes/{theme_code}`.
- `list_capability_theme_controls` tool — SCF controls mapped to a capability theme with scoping status, implementation status, and maturity level. Supports pagination (`limit`, `offset`) and scope filtering (`scope_status`). Wraps `GET /organizations/{org_id}/capability-themes/{theme_code}/controls`.
- `get_capability_theme_evidence_posture` tool — per-theme evidence assessment rollup (file counts by status, average relevance score, derived evidence confidence). Wraps `GET /organizations/{org_id}/capability-themes/evidence-posture`.
- `trigger_window_assessment` tool — queue a windowed AI assessment that scores all evidence files inside a frequency-derived time window as a portfolio against the union of required artifact types across mapped SCF controls. Editor role. Wraps `POST /organizations/{org_id}/evidence/{evidence_id}/assess-window` (scf-controls-platform #568, M1a).
- `list_window_assessments` tool — list recent windowed assessments for an evidence ID with `limit`/`offset` pagination. Viewer role. Wraps `GET /organizations/{org_id}/evidence/{evidence_id}/window-assessments`.
- `get_window_assessment` tool — fetch a single windowed assessment by ID with full detail (window bounds, file IDs, coverage, findings, tokens, cost). Viewer role. Wraps `GET /organizations/{org_id}/evidence/window-assessments/{assessment_id}`.
- `bulk_assess_windows` tool — queue windowed assessments for up to 25 evidence IDs in one call. Editor role. Wraps `POST /organizations/{org_id}/evidence/assess-windows-bulk`.
- `get_window_assessment_summary` tool — aggregate windowed-assessment metrics (counts by status including the new `insufficient_sample` bucket, average relevance, total cost). Viewer role. Wraps `GET /organizations/{org_id}/evidence/window-assessments/summary`.

### Fixed
- **Server handshake now reports the correct version.** `src/index.ts` hardcoded `"0.1.0"` while `package.json` was on `0.5.0`; the server now reads `name` and `version` from `package.json` at startup via `createRequire`, so MCP clients always see the real published version. Closes #53.
- **README tool count corrected from 38 to 67 (8 domains, not 7).** The domain table was missing Webhooks and understated Evidence, Risk Management, and Capabilities. A CI check (`Verify README tool count matches source`) now fails PRs that drift again. Closes #64.

### Changed
- **Branding aligned: SCF Controls Platform leads, ComplianceGenie credited as maintainer.** README hero copy updated to remove the `Built by X | Platform: Y` split. Closes #65.

Closes #50, #53, #64, #65.

## [0.5.0] - 2026-04-01

### Added
- `get_evidence_validation` tool — retrieve validation result for a specific evidence file (status, completeness score, rule findings)
- `revalidate_evidence_file` tool — re-run the validation engine against a specific evidence file (editor+ role required)
- `get_evidence_validation_summary` tool — aggregate validation metrics for the org dashboard (counts by status, pass rate)

## [0.4.0] - 2026-03-28

### Fixed
- `create_evidence` — corrected request schema to match `EvidenceTrackingCreate` (was sending `title`/`description`/`evidence_type` instead of `evidence_id`/`is_tracked`/`method_of_collection`/etc., causing HTTP 422)
- API client now always sends `Content-Type: application/json` and `{}` body for POST/PUT/PATCH, preventing spurious 422 errors on endpoints with Pydantic body parameters

### Note
- `batch_update_evidence` (added in 0.3.0) now works — requires backend endpoint `POST /evidence-tracking/batch` (added in scf-controls-platform PR #483)

## [0.3.0] - 2026-02-28

### Added
- `update_vendor` tool — PATCH existing vendor records (name, description, category, criticality, status, website, contact_email)
- `update_system` tool — PATCH existing system records (name, description, system_type, status, vendor, category)
- `vendor` and `category` parameters to `create_system`
- `status` parameter to `create_vendor` (enum: prospect/active/inactive/under_review, default: prospect)

### Fixed
- `maturity_level` in `update_scoped_control` and `batch_update_controls` now validates as enum `["L0"..."L5"]` — bare numeric strings (e.g., `"4"`) are rejected with a descriptive error at the Zod layer. Closes #28.

Closes #28, #30.

## [0.2.0] - 2026-02-19

### Fixed
- **All catalog endpoints now work** — added missing `/catalog/` prefix to 6 tools: `list_controls`, `get_control`, `list_frameworks`, `list_domains`, `list_evidence_catalog`, `list_assessment_objectives`
- **Evidence tracking** — `list_evidence` and `create_evidence` now use correct `/evidence-tracking` path
- **Evidence maturity** — `get_evidence_maturity` now uses correct `/organizations/{id}/evidence-maturity-summary` path
- **Capability themes** — `list_capability_themes` now requires `org_id` and uses correct org-scoped path
- **Capabilities** — `list_capabilities` now uses correct `/evidence-capabilities` path
- **Audit log** — `get_audit_log` now uses correct `/organizations/{id}/audit-log` path
- **Vendor research** — `trigger_vendor_research` POST path fixed (removed `/trigger` suffix)
- **DPSIA** — `trigger_dpsia` POST path fixed (removed `/trigger` suffix)
- **Framework scoping** — `scope_framework` now uses correct `/bulk-scope-framework` path
- **Scoped controls** — `list_scoped_controls` now uses paginated endpoint to prevent 660K+ response overflow

### Changed
- All pagination standardized to `limit`/`offset` (was incorrectly using `page`/`per_page`)
- All `org_id` parameter descriptions now guide LLMs to call `list_organizations` first
- Tool descriptions improved for LLM clarity

## [0.1.7] - 2026-02-19

### Changed
- Version-bump workflow now creates PR instead of direct push; npm-publish auto-detects version and creates GitHub Releases

## [0.1.6] - 2026-02-19

### Fixed
- **Breaking fix:** `ImplementationStatus` enum values changed from UPPERCASE to lowercase to match platform API (e.g., `not_started` instead of `NOT_STARTED`)
- **Breaking fix:** `update_scoped_control` and `get_scoped_control` now use `scf_id` (e.g., `"AST-01"`) instead of UUID — matches the platform's PATCH route
- `batch_update_controls` schema expanded from 4 fields to 11 fields, matching the platform's updated `BatchScopedControlOperation` schema
- Tool descriptions updated to clarify `scf_id` usage and lowercase status values

## [0.1.5] - 2026-02-19

### Fixed
- Fixed npm trusted publisher case-sensitivity (owner must match GitHub exactly)
- Restored registry-url in setup-node for proper OIDC .npmrc generation

## [0.1.4] - 2026-02-19

### Fixed
- Removed registry-url from setup-node to allow npm native OIDC exchange

## [0.1.3] - 2026-02-19

### Fixed
- Fixed OIDC token conflict with setup-node's default NODE_AUTH_TOKEN

## [0.1.2] - 2026-02-19

### Fixed
- Release workflow now uses Node 24 (required for npm OIDC trusted publishing)

## [0.1.1] - 2026-02-19

### Changed
- Switched to npm OIDC trusted publishing (no static tokens)
- Added provenance attestation for supply chain security
- Release workflow validates tag matches package.json version

### Security
- CI: Gitleaks secret detection, CodeQL analysis, Semgrep SAST
- Dependabot: Weekly dependency and GitHub Actions updates
- Branch protection with required status checks

## [0.1.0] - 2026-02-19

### Added
- Initial release of mcp-server-scf
- 35+ MCP tools across 8 domains: Catalog, Control Scoping, Evidence, Risk, Vendors, Organization, Capabilities, Systems
- Full SCF Controls Platform API coverage
- Claude Desktop, Claude Code, Cursor/Windsurf, and Docker support
- TypeScript strict mode with Zod schema validation
- Structured error handling with `errorResult()`
- npm package publishing (`mcp-server-scf`)
- Docker image support (`markac007/mcp-server-scf`)

### Security
- API keys never logged or included in error messages
- All communication over HTTPS
- SHA-256 key hashing server-side
- Rate limiting: 100 req/min (read), 20 req/min (write)
- Multi-tenant organization scoping
