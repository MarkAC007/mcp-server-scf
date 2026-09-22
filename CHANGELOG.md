# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Guided journey (#1058, platform v0.40.0).** New `journey` domain — `scf_get_journey` (the staged path with preconditions evaluated; never writes, so an org with no journey sees the default template as a preview), `scf_list_journey_templates`, `scf_import_journey` (create or replace from a deployment template or an uploaded practitioner artefact) and `scf_attest_journey_stage` (the only route that passes a stage; nothing advances on computed evidence). `template_key` is constrained to a bare filename stem at the tool boundary, mirroring the platform's own traversal refusal (#1061, #1062). New domain: 13 → 14 domain files.
- **Framework scoping read + override (#1050, platform v0.38.0).** `scf_get_framework_scope_summary` (coverage and selection state in one view), `scf_preview_framework_scope_change` (model an add/remove without applying it — the blast radius before the change) and `scf_set_scope_override` (pin one control in or out of scope; `inherit` clears the override back to the framework rollup). Control Scoping domain 7 → 10 tools.
- **Team work scoping filters (#1053, platform v0.39.0).** `scf_list_scoped_controls` and `scf_list_evidence` gain `team_id`, `my_teams`, `function_id` and `accountable_owner_type`; `scf_list_teams` gains `mine`, which also makes the platform return `membership_role` per team. `my_teams` intersects with `team_id` rather than overriding it, so asking for a team you are not on returns nothing. Total 189 → 196 tools.
- **Window verdict review (#236).** `scf_review_window_assessment_verdict` confirms or overrides the AI's per-objective designations on a window assessment (`POST .../evidence/window-assessments/{assessment_id}/verdict/review`, body mirrors `scf_review_evidence_assessment`: `decision`, `reason`, `ao_overrides`), and `scf_get_window_assessment_versions` lists the window's frozen verdict history. This is the *verdict* decision; `scf_review_window_assessment` remains the *acceptance* decision. Evidence domain 39 → 41 tools; total 187 → 189.
- **`tier` on `scf_get_assessment_review_queue` (#236).** `file` (default, unchanged behaviour) lists per-file verdicts; `window` lists window verdicts — the web app's Awaiting-confirmation queue now that the platform's windowed assessment flags default on. Entries carry `kind`. Against a platform older than v1.192.1, which ignores `tier`, `tier: "window"` returns an error instead of mislabelling per-file entries.
- **Vocabulary drift guard (#235).** Hand-copied enums the platform expresses as a `^(a|b)$` pattern now come from one `src/lib` module each (`system-types.ts`, `vendor-statuses.ts`); `scripts/api-coverage.mjs` carries a `VOCABULARIES` table and fails when any platform pattern differs from its module, and `tests/vocabularies.test.ts` checks every enum site and its prose against the patterns captured in `tests/fixtures/platform-vocabularies.json`. Add a row to the table and the fixture for each new vocabulary.

- **58 new tools (129 → 187) and a written scope policy.** Every platform operation now has a recorded verdict — `in`, `deferred` or `out` with a reason — in [`docs/tool-scope.md`](docs/tool-scope.md), generated from [`docs/tool-scope.json`](docs/tool-scope.json) by `scripts/api-coverage.mjs`, which also fails when the map and the code disagree. The admission tests: reachable with an org-scoped user API key; recurring or bulk GRC work; text transport; not identity, credential, billing or infrastructure administration. By domain:
  - **Evidence (26 → 39):** `scf_get_evidence`, `scf_batch_update_evidence` (≤500 upserts in one transaction), `scf_create_evidence_task`, `scf_update_evidence_task`, `scf_complete_evidence_task`, `scf_review_evidence_file`, `scf_delete_evidence_file`, `scf_get_upcoming_evidence`, `scf_get_frequency_health`, `scf_get_assessment_review_queue`, `scf_review_evidence_assessment`, `scf_refresh_stale_window_assessments`, `scf_review_window_assessment`.
  - **Risk (12 → 17):** `scf_update_risk_assessment` (closes the long-standing "no update path for scored risks" gap), `scf_delete_risk_assessment`, `scf_get_risks_for_control`, `scf_get_controls_for_risk`, `scf_get_risk_profile`.
  - **Vendors (11 → 23):** certifications (`scf_list_vendor_certifications`, `scf_create_vendor_certification`, `scf_update_vendor_certification`, `scf_delete_vendor_certification`), action items (`scf_list_vendor_action_items` — one vendor or org-wide, `scf_create_vendor_action_item`, `scf_update_vendor_action_item`, `scf_delete_vendor_action_item`), compensating controls (`scf_list_compensating_controls`, `scf_create_compensating_control`, `scf_update_compensating_control`, `scf_delete_compensating_control`).
  - **Teams (new, 11):** `scf_list_functions`, `scf_list_teams`, `scf_get_team`, `scf_create_team`, `scf_update_team`, `scf_add_team_member`, `scf_remove_team_member`, `scf_list_team_assignments`, `scf_create_team_assignment`, `scf_batch_create_team_assignments` (≤500 items, one notification), `scf_delete_team_assignment`.
  - **Collaboration (new, 7):** `scf_list_assignments`, `scf_create_assignment`, `scf_delete_assignment`, `scf_list_comments`, `scf_create_comment`, `scf_update_comment`, `scf_delete_comment` (author-only edit and retraction, so an agent can withdraw its own mistake).
  - **Capabilities (14 → 19):** `scf_get_system`, `scf_list_system_capabilities`, `scf_create_system_capability`, `scf_update_system_capability`, `scf_get_systems_for_evidence`.
  - **Catalog (6 → 8):** `scf_get_domain`, `scf_get_catalog_evidence`.
  - **Control scoping (6 → 7):** `scf_bulk_unscope_framework` (overlap-protected).
  - **Organization (8 → 10):** `scf_mark_notifications_read` (one by id, or every notification with an explicit `all=true` — omitting both is an error, never the broader write), `scf_get_org_work_queue` (the organisation's consolidated GRC queue: overdue tasks, blocking controls, stale schedules; the existing `scf_get_work_queue` remains the caller's cross-org dashboard).
- **Handler-level tests** (`tests/handlers.test.ts`) drive the new tools against a recording client stub: evidence-task filter mapping, completion query param, the vendor action-item and notification route switches, array params on team assignments, and errorResult wrapping.
- **Tool-definition payload measured.** `tools/list` is now 218 KB (≈55k tokens) for 187 tools, up from 142 KB (≈36k) for 129 — linear in tool count, ~1.3 KB per tool. Recorded in [`docs/tool-scope.md`](docs/tool-scope.md) with the cut list to use if a client needs a smaller surface.
- **API client: `post`/`patch`/`put`/`delete` accept query params** (third argument), so tools never hand-build query strings.
- **API client accepts `string[]` query values** and sends them as repeated keys (`item_ids=a&item_ids=b`), the FastAPI list convention.
- **`scf_get_change_cursor`** — the platform's per-organization change cursor (`GET /organizations/{org_id}/changes/cursor`, platform epic #921): newest audit timestamp plus row count, a two-field "has anything changed?" probe to poll before re-pulling the audit log. Organization domain 7 → 8 tools; total 128 → 129.
- **`scf_get_audit_log` filters.** The tool exposed only `limit`/`offset`; the platform's audit-log endpoint accepts eleven filters and they are now all passed through: `entity_type`, `entity_id`, `scf_id`, `action` (create/update/delete), `changed_by_user_id`, `action_source` (ui/api_key/mcp/system), `request_id`, `date_from`, `date_to`, `actor_id`, `search_text`. `limit` maximum raised 100 → 200 to match the platform.
- **Audit attribution headers.** Every request now carries `X-Audit-Source: mcp` and `User-Agent: mcp-server-scf/<version>`. The platform only records a change as `action_source = mcp` when one of those is present; without them every MCP write was attributed to `api_key`, indistinguishable from a script.

### Changed
- **Dependency bumps folded into this release (#238, superseding #224, #225, #228–#234).** `auto-release.yml` cuts an npm release on every non-`chore(release)` merge to main, so the open Dependabot PRs ship here as one merge rather than ten releases. devDependencies: `vitest` and `@vitest/coverage-v8` 4.1.11 → 5.0.0 (they peer on each other exactly and can only install together — the reason #225 and #228 each failed `npm ci` alone), `typescript-eslint` 8.58.2 → 8.70.0, `@types/node` 25.7.0 → 26.5.1, `lint-staged` 17.4.1 → 17.5.1. GitHub Actions, SHA pins taken verbatim from the bot diffs: `github/codeql-action` (init, autobuild, analyze, upload-sarif) v4.36.3 → v4.38.0, `actions/checkout` v7.0.0 → v7.0.1 across 9 sites, `softprops/action-gh-release` v3.0.1 → v3.0.3, `ossf/scorecard-action` v2.4.3 → v2.4.4, `actions/attest-build-provenance` v4.1.1 → v4.2.2. **No production dependency moves** — `dependencies` and `overrides` are byte-identical to `main`.
- **zod 4.6.2 → 4.6.5 (#241).** Lockfile only — the declared range stays `^4.3.6`, exactly as the bot's diff has it. This is the one production dependency in the batch, so it was verified by installing it (`npm ci` checks the integrity hash) and by a live stdio handshake, not on paper: zod builds every tool's schema, so a bad resolve would surface as a malformed `tools/list`.
- **prettier held at 3.9.6 (#242 not folded whole).** Once #238 lands, #242 reduces to prettier alone — its other two bumps are the same versions #238 brings. prettier 3.9.7 (16 Sep) and 3.9.8 (17 Sep) are both inside the workstation's 7-day `min-release-age` cooldown and there is no release between them and 3.9.6, so there is no compliant fallback to take. Held rather than forced; 3.9.7 clears ~23 Sep and 3.9.8 ~24 Sep.
- **`dependabot.yml` gains a `vitest` group and a `typescript` semver-major ignore.** The group stops a vitest major from ever arriving as two un-installable PRs again. The ignore is temporary and carries its own removal condition: `typescript-eslint@8.70.0` declares peer `typescript ">=4.8.4 <6.1.0"`, so typescript 7 (#226) cannot install; drop the entry once that peer range admits 7.x.

### Fixed
- **`scf_create_system` / `scf_update_system` rejected 7 of the platform's 15 system types (#235).** The Zod enum was stale at the original 8; it now carries `endpoint_management`, `vulnerability_management`, `email_security`, `security_awareness`, `password_manager`, `communication` and `hr_system`, and the parameter prose and `docs/tools/capabilities.md` list all 15.
- **Vendor `status` enum rejected 3 of the platform's 6 statuses and offered one it does not have.** `scf_list_vendors`, `scf_create_vendor` and `scf_update_vendor` accepted `prospect`, `active`, `inactive`, `under_review`; the platform's vocabulary is `prospect`, `active`, `under_review`, `approved`, `suspended`, `offboarded` (`inactive` always returned 422). Found by the new drift guard.
- **`docs/tools/evidence.md` documents `scf_get_control_assessment_composite` and `scf_list_control_assessment_composites`** — both tools existed but had no section, so the file claimed 26 tools while listing 24.
- **Every write tool now declares `readOnlyHint: false` and `destructiveHint`** — the annotation test was already enforcing it; the new tools follow the same convention.
- **`scf_list_evidence_tasks` filters were silently ignored.** The tool sent `org_id`/`assignee`/`status` but the platform reads `organization_id`/`assigned_user_id`/`status_filter`, so every call returned the unfiltered list. Keys corrected; `overdue_only`, `assigned_to_me` and `evidence_tracking_id` filters added.
- **`scf_create_risk` `treatment_status`** now validates the platform's workflow values (`identified`, `analysed`, `treating`, `treated`, `accepted`, `monitoring`); the description offered `mitigate`/`accept`/`transfer`/`avoid`, which the platform rejects with 422.
- **`scf_list_evidence_tasks` status filter** now validates the platform's values (`not_started`, `in_progress`, `completed`); the description cited `open`/`done`, which the platform never returns.
- **Engagement tool descriptions matched to the platform.** Status values are the real enum (`draft`, `active`, `under_review`, `closed` — the descriptions cited non-existent `planning`/`fieldwork`), and `scf_list_engagements` / `scf_update_engagement` / `scf_list_engagement_queries` now validate `status` with `z.enum`. Create/update engagement require `editor`, not `admin`; delete is draft-only (409 otherwise); re-granting a revoked auditor reactivates the grant; `scf_list_my_engagements` returns active grants only; the query lifecycle states its allowed transitions (open → answered|closed, answered → open|closed, closed → open) and that posting a response moves an open query to answered.

## [3.0.0] - 2026-09-07

### Removed
- **BREAKING — the seven CDM tools: `scf_get_cdm_document_map`, `scf_list_cdm_documents`, `scf_list_cdm_proposals`, `scf_accept_cdm_proposal`, `scf_dismiss_cdm_proposal`, `scf_list_cdm_mappings`, `scf_query_cdm_corpus`.** The SCF Controls Platform retired Compliance Document Mapping (scf-controls-platform#902, phases 3–6 shipped in platform release 0.28.0); `/organizations/{org_id}/cdm/*` no longer exists, so every one of these tools returned 404 against a current platform. `src/tools/cdm.ts` and `docs/tools/cdm.md` are gone. Consumers pinned to `^2.2` keep working except that these seven tools 404 — which is why this is a major, not a patch. Existing-document analysis now happens outside the platform (see the onboarding playbook's extraction ledger); a control-scoped `scf_get_policy_coverage` arrives with the platform's Policy Coverage epic, not here.

### Changed
- Tool count 135 → 128 across 11 domains; README table, `docs/architecture.md`, `mcpb/manifest.json`, `server.json`, `smithery.yaml` and the registration-count test updated together.

## [2.2.3] - 2026-09-07

### Changed
- README: removed the two dead Smithery badges (Smithery's badge endpoint returns 500 and the listing is gone); the Official MCP Registry badge remains (#202).

## [2.2.2] - 2026-09-07

### Fixed
- `npm audit --audit-level=high` CI gate: pinned `fast-uri` 3.1.6 and moved the `hono` override to 4.12.34 via `package.json` `overrides` (cooldown-safe); lockfile follow-ons qs 6.16.0, fflate 0.8.3, @hono/node-server 2.1.1. Zero open audit findings (#203).

## [2.2.1] - 2026-08-30

### Fixed
- Release automation: prettier-format the jq-stamped `package.json`/`server.json`/`mcpb/manifest.json` so version-bump PRs pass `format:check` (#196).

## [2.2.0] - 2026-08-29

### Added
- **Document tools (15) — `scf_list_document_generators`, `scf_list_document_domains`, `scf_get_document_settings`, `scf_update_document_settings`, `scf_generate_documents`, `scf_get_document_generation_status`, `scf_list_documents`, `scf_get_document`, `scf_update_document_section`, `scf_get_document_section_generated`, `scf_resolve_document_section`, `scf_transition_document`, `scf_get_document_history`, `scf_export_document`, `scf_preview_document`.** Full surface for the platform's ISMS document generation (scf-controls-platform#762 and follow-ups): the three-layer merge (generated / human-edited / retired), conflict and pending-retirement resolution, lifecycle transitions, history, and markdown-or-HTML export.
- **Audit engagement tools (16) — `scf_list_engagements`, `scf_get_engagement`, `scf_create_engagement`, `scf_update_engagement`, `scf_delete_engagement`, `scf_get_engagement_scope`, `scf_get_engagement_presentation`, `scf_list_my_engagements`, `scf_list_engagement_auditors`, `scf_add_engagement_auditor`, `scf_remove_engagement_auditor`, `scf_list_engagement_queries`, `scf_get_engagement_query`, `scf_create_engagement_query`, `scf_respond_to_engagement_query`, `scf_update_engagement_query_status`.** Audit Engagement Workspaces: scope frozen against the catalog version it was assessed under, framework-native presentation, engagement-scoped auditor access, and structured auditor queries with response threads.
- **Catalog reconciliation tools (9) — `scf_get_catalog_reconciliation_status`, `scf_preview_catalog_reconciliation`, `scf_list_reconciliation_runs`, `scf_get_reconciliation_run`, `scf_set_reconciliation_actions`, `scf_apply_catalog_reconciliation`, `scf_rollback_catalog_reconciliation`, `scf_cancel_catalog_reconciliation`, `scf_get_catalog_changelog`.** Per-org SCF catalog version upgrades: preview the diff, record a migrate/retain/retire_only decision per deprecated entity, apply, roll back. Apply is guarded by `expected_to_version` and rollback by a typed confirmation.
- **CDM tools (7) — `scf_get_cdm_document_map`, `scf_list_cdm_documents`, `scf_list_cdm_proposals`, `scf_accept_cdm_proposal`, `scf_dismiss_cdm_proposal`, `scf_list_cdm_mappings`, `scf_query_cdm_corpus`.** Compliance Document Mapping: per-domain corpus coverage map, the control-level proposal review queue with cascading accept/dismiss, and passage search against a scoped control.
- `include_deprecated` param on `scf_list_controls`, `scf_list_domains`, `scf_list_evidence_catalog` and `scf_list_assessment_objectives` — the catalog API now defaults to active rows only and badges deprecated rows when they are included.
- `ScfApiClient.getText()` — fetches endpoints that answer with text rather than JSON. `scf_export_document` needs it; the platform renders markdown and HTML there, not a JSON envelope.

### Fixed
- **204 No Content responses no longer fail as JSON parse errors.** `ScfApiClient.request()` returned `response.json()` unconditionally, so any endpoint answering 204 surfaced a parse error for a call that had actually succeeded. Engagement and auditor deletes are the first 204 endpoints the server calls; empty bodies now resolve to `null`.

### Changed
- Tool count 88 → 135 across 12 domains (documents +15, engagements +16, catalog-reconciliation +9, cdm +7); README table, per-domain docs and the registration-count test updated together.

### Not exposed (deliberate)
- `catalog_upgrade_admin.py` (10 platform-admin routes) — every route gates on platform admin, which an org-scoped API key cannot satisfy.
- `oidc_auth.py` (4 routes) — browser redirect flow, not reachable over stdio.
- CDM document upload, reingestion and chunk backfill — multipart or long-running maintenance operations that belong in the web UI.
- PDF document export — the platform renders it, but a binary payload is the wrong shape for a tool result.

### BREAKING
- **`SCF_API_URL` is now required — the hosted SaaS default is gone.** The platform's hosted instance (`uk.scfcontrolsplatform.app`) was decommissioned; the SCF Controls Platform is self-hosted only. The client no longer falls back to the dead host: `getClient()` throws a setup-pointing error when `SCF_API_URL` is unset. `server.json`, `smithery.yaml`, and `mcpb/manifest.json` now mark the variable required with no default; README/docs rewritten around "your own instance" (deploy from [scf-controls-platform-oss](https://github.com/MarkAC007/scf-controls-platform-oss)). Anyone who relied on the default was already pointing at a dead host — set `SCF_API_URL` to your instance's base URL (e.g. `http://localhost:8000`).
- **`scf_trigger_dpsia` removed, replaced by `scf_trigger_vendor_assessment`.** Platform PR scf-controls-platform#686 consolidated the vendor lifecycle: `POST …/vendors/{id}/assessments` is now an async AI-assessment trigger (HTTP 202) and the `/dpsia/*` paths are deprecated aliases whose old enum values (`new`, `annual-review`) no longer validate. The new tool keeps the auto-derive behaviour for `services_used` and uses the new `assessment_type` enum (`initial`/`annual`/`adhoc`). `client_name` is no longer accepted by the platform request schema and was dropped.

### Added
- `scf_list_vendor_assessments`, `scf_get_latest_vendor_assessment`, `scf_get_vendor_assessment`, `scf_get_vendor_assessment_status` tools — full read surface for the new vendor AI assessments (scf-controls-platform#686), including RAG status, recommendation, `report_markdown`/`report_json`, research sources, and job polling.
- `scf_list_system_catalog` + `scf_get_system_catalog_template` tools — browse the platform's DB-backed system knowledge catalog (templates, aliases, curated recipes). Wraps `GET /system-catalog[/{slug}]` (scf-controls-platform#689).
- `scf_get_system_recipes`, `scf_generate_system_recipes`, `scf_get_recipe_generation_status` tools — per-system evidence-collection recipes with template/alias/fallback matching and async AI generation (scf-controls-platform#689).
- `vendor_id` (structural vendor link, same-org validated) and `catalog_template_id` params on `scf_create_system` / `scf_update_system`, and a `vendor_id` filter on `scf_list_systems`; system responses now carry `vendor_id` + nested `linked_vendor` (scf-controls-platform#692).
- `maturity_level` (`L0`–`L5`) param on `scf_create_evidence` / `scf_update_evidence` — evidence-tracking maturity now persists platform-side (scf-controls-platform#694).

### Changed
- Tool count 74 → 83 (vendors 7→11, capabilities 9→14); counts aligned across README, architecture docs, `server.json`, `mcpb/manifest.json`, `smithery.yaml`, and the banner asset.
- HTTP 402 is now surfaced as "Usage limit reached on your instance…" instead of the SaaS-era "Subscription limit reached. Upgrade your plan." wording.
- `scf_get_control_assessment_composite` tool — rolled-up assessment composite for a single SCF control (composite score, status band, included/missing evidence, mandatory gaps, per-window detail). Wraps `GET /organizations/{org_id}/controls/{scf_id}/assessment-composite`. Closes #569.
- `scf_list_control_assessment_composites` tool — cursor-paginated organisation-wide list of rolled-up assessment composites ordered worst-band first, with `status`, `domain`, and `computation_version` filters. Wraps `GET /organizations/{org_id}/controls/assessment-composites`. Closes #569.

### Security
- **Added `publishConfig.provenance: true`** to `package.json` so provenance is enforced regardless of how publish is invoked (belt-and-braces alongside `auto-release.yml`'s `--provenance` flag).
- **Guarded `prepare: husky` script** (`husky || true`) so it no longer hard-fails consumer installs or `npm pack` when husky is absent. Removes the Socket.dev "install script risk" signal.
- **Narrowed `engines.node` to `>=20.0.0`** — Node 18 reached end-of-life in April 2025. CI matrix dropped from [18, 20, 22] to [20, 22].
- **All GitHub Actions pinned to full commit SHAs** with `# vX.Y.Z` trailing comments (for Dependabot) in `ci.yml`, `security.yml`, `auto-release.yml`, `claude.yml`, `scorecard.yml`. Covers `actions/checkout`, `actions/setup-node`, `gitleaks/gitleaks-action`, `github/codeql-action`, `softprops/action-gh-release`, `anthropics/claude-code-action`, `ossf/scorecard-action`, `actions/upload-artifact`.
- **CI `npm audit` step is now a hard gate** — removed `continue-on-error: true`. Future high-severity transitive vulns in the runtime dependency tree block merge. (Dev-only moderate/low vulns still pass the gate.)
- **Added `npm audit signatures` job** in `security.yml` — verifies every installed dependency has a valid registry signature on every push / PR / weekly cron.
- **Added OpenSSF Scorecard workflow** (`.github/workflows/scorecard.yml`) — weekly + push analysis, publishes to scorecard.dev, uploads SARIF to GitHub code-scanning.
- **Bumped `@modelcontextprotocol/sdk` to `^1.29.0` in `package.json`** (was `^1.27.1`, though the lockfile had already hoisted to 1.29.0 via #45 — this aligns the declared range). Resolves transitive advisories in `hono`, `@hono/node-server`, `express-rate-limit`: `npm audit --audit-level=high` now exits 0.
- **README Security badges added** — OpenSSF Scorecard + Socket.dev; Node badge bumped to `>=20`.
- **SECURITY.md supported-versions table** updated from `0.1.x` to `1.x`.

### Changed
- **Tool descriptions rewritten for agent tool-selection quality (all 72 tools).** Each description now follows Anthropic's tool-description guidance: front-loaded action verb, side effects and role requirements called out in the first sentence where relevant (`write — editor+ role`, `destructive write`, `async`, `admin role`), rate-limit notes on ingestion endpoints, and a hard ≤200 char ceiling (longest is 199). Parameter descriptions standardised — UUIDs get `.uuid()` + "obtain from scf_*" cross-references; enums spell out every value; ISO-8601 fields note the `YYYY-MM-DD` shape. `docs/tools/*.md` regenerated from the new source, `tests/registration.test.ts` gains a `<=200 char` length guard. Closes #74.

## [1.0.0] - 2026-04-18

### BREAKING
- **All 72 tools renamed with an `scf_` prefix.** `list_controls` → `scf_list_controls`, `create_vendor` → `scf_create_vendor`, and so on for every tool in every domain. Tool parameters, return shapes, handlers, and HTTP endpoints are unchanged. No deprecation aliases are shipped — old names are removed outright in this release. See [`docs/migration-scf-prefix.md`](docs/migration-scf-prefix.md) for the full before/after mapping and an explanation of the cutover strategy. Closes #62.

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
- **README tool count corrected from 38 to 72 (8 domains, not 7).** The domain table was missing Webhooks and understated Evidence, Risk Management, and Capabilities; Evidence also gained 5 windowed-assessment tools via the recent `main` merge. A CI check (`Verify README tool count matches source`) now fails PRs that drift again. Closes #64.

### Changed
- **Branding aligned: SCF Controls Platform leads, ComplianceGenie credited as maintainer.** README hero copy updated to remove the `Built by X | Platform: Y` split. Closes #65.
- **Code-quality toolchain wired up.** ESLint 9 (flat config, `typescript-eslint`) actually runs in CI now — the silent `|| echo "eslint not installed"` guard has been removed. Prettier 3 added with `.prettierrc.json` (120-col width matching existing style) and enforced in CI via `npm run format:check`. Husky + lint-staged pre-commit hook runs `eslint --fix` and `prettier --write` on staged files only. Whole repo reformatted in a single pass. Closes #67, #68, #69.
- **Tests: vitest suite added and required in CI.** 29 tests across `tests/registration.test.ts` (per-domain tool registration + name/description conformance), `tests/errors.test.ts` (every `formatError` branch + `errorResult` shape), and `tests/handshake.test.ts` (spawns the built server over stdio and validates the MCP `initialize` response). The handshake test is also a regression guard against the `0.1.0` version-drift bug. Coverage reporting via `@vitest/coverage-v8` available through `npm run test:coverage`. Closes #66.
- **Explicit MCP capabilities declaration.** `McpServer` is now constructed with `{ capabilities: { tools: {} } }` so clients don't rely on inferred capabilities — asserted by the new handshake test. Closes #54.

Closes #50, #53, #54, #64, #65, #66, #67, #68, #69.

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
