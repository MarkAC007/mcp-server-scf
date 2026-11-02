# Migrating to the consolidated tool surface (v4.0)

v4.0 folds the 225 single-route tools into 41 noun-and-direction tools plus `scf_load_tools`, and loads only the core groups at startup. Every original tool survives as a **method** of one exposed tool: the parameters, platform routes, role requirements and results are unchanged; what changes is the tool name and the extra `method` argument. Like the v1.0 `scf_` prefix rename, it is a clean break with no aliases.

## Why

A client pays for `tools/list` on every session. At 224 tools that was 282,940 bytes, about 71k tokens, before the first question. The consolidated default lists 26 tools in 107,353 bytes (about 27k tokens); the whole surface is 42 tools in 175,483 bytes. Fewer, richer tools are also easier for a model to choose between than 42 evidence tools that differ by one word.

## What changed

- **Consolidation.** One tool per noun and direction, e.g. `scf_vendor_read` (method: `list`, `get`, `research`, …) and `scf_vendor_write` (method: `create`, `update`, `research`, `assess`). The `method` parameter's description carries each method's original description. A parameter every method requires (usually `org_id`) stays required; any other parameter is optional and says which methods use it. On a call the server re-validates the arguments against the chosen method's own schema, so each method's defaults and constraints apply exactly as before.
- **Read/write split.** Read tools carry `readOnlyHint: true`; a write tool carries `destructiveHint: true` when any of its methods deletes. Clients that gate permissions by tool can therefore allow all `*_read` tools at once.
- **Progressive disclosure.** Only the core groups (`catalog`, `controls`, `evidence`, `assessments`, `risk`, `vendors`, `systems`, `organization`) are in the tool list at startup. `scf_load_tools` enables more (`teams`, `collaboration`, `documents`, `engagements`, `assurance`, `catalog-reconciliation`, `webhooks`, `journey`, or `all`); the server then sends `notifications/tools/list_changed`. A client that does not honour that notification can start the server with `SCF_LOAD_ALL_TOOLS=true` to get everything up front.
- Three tools whose noun has a single operation keep their original name and shape: `scf_list_evidence_tasks`, `scf_update_org_settings`, `scf_mark_notifications_read`.
- The server `name`, the `SCF_API_URL` / `SCF_API_KEY` configuration and the MCP handshake are unchanged.

## What to update

1. **MCP client config** — nothing, unless your client ignores `list_changed`; then add `SCF_LOAD_ALL_TOOLS=true` to its environment.
2. **Prompts, skills and automations that call tools by name** — replace each old name with the new tool and `method` from the table below, e.g. `scf_list_vendors(org_id)` becomes `scf_vendor_read(method: "list", org_id)`.
3. **Prompts that assume every tool is present** — call `scf_load_tools` first for anything outside the core groups.

## Tool name mapping

Grouped by exposed tool. _Core_ groups are loaded at startup; the rest load through `scf_load_tools`.

### `scf_catalog_read` (group `catalog`, core)

| `method`                     | Was                              | Route                                                                                                                    |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `list_controls`              | `scf_list_controls`              | `GET /catalog/controls`                                                                                                  |
| `get_control`                | `scf_get_control`                | `GET /catalog/controls/{…} <br> GET /catalog/controls/{…}/assessment-objectives <br> GET /catalog/controls/{…}/evidence` |
| `list_domains`               | `scf_list_domains`               | `GET /catalog/domains`                                                                                                   |
| `get_domain`                 | `scf_get_domain`                 | `GET /catalog/domains/{…}`                                                                                               |
| `list_frameworks`            | `scf_list_frameworks`            | `GET /catalog/frameworks`                                                                                                |
| `list_assessment_objectives` | `scf_list_assessment_objectives` | `(lib)`                                                                                                                  |
| `list_evidence`              | `scf_list_evidence_catalog`      | `GET /catalog/evidence`                                                                                                  |
| `get_evidence`               | `scf_get_catalog_evidence`       | `GET /catalog/evidence/{…}`                                                                                              |

### `scf_control_read` (group `controls`, core)

| `method`                   | Was                                  | Route                                               |
| -------------------------- | ------------------------------------ | --------------------------------------------------- |
| `list`                     | `scf_list_scoped_controls`           | `GET /organizations/{…}/scoped-controls-paginated`  |
| `get`                      | `scf_get_scoped_control`             | `GET /organizations/{…}/scoped-controls/{…}`        |
| `stats`                    | `scf_get_scoping_stats`              | `GET /organizations/{…}/scoped-controls/stats`      |
| `framework_scope`          | `scf_get_framework_scope_summary`    | `GET /organizations/{…}/framework-scoping`          |
| `preview_framework_change` | `scf_preview_framework_scope_change` | `POST /organizations/{…}/framework-scoping/preview` |

### `scf_control_write` (group `controls`, core)

| `method`              | Was                              | Route                                                            |
| --------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `update`              | `scf_update_scoped_control`      | `PATCH /organizations/{…}/scoped-controls/{…}`                   |
| `batch_update`        | `scf_batch_update_controls`      | `POST /organizations/{…}/scoped-controls/batch`                  |
| `scope_framework`     | `scf_scope_framework`            | `POST /organizations/{…}/scoped-controls/bulk-scope-framework`   |
| `unscope_framework`   | `scf_bulk_unscope_framework`     | `POST /organizations/{…}/scoped-controls/bulk-unscope-framework` |
| `set_scope_override`  | `scf_set_scope_override`         | `PUT /organizations/{…}/scoped-controls/{…}/scope-override`      |
| `set_basis_override`  | `scf_set_control_basis_override` | `PUT /organizations/{…}/scoped-controls/{…}/basis-override`      |
| `set_framework_basis` | `scf_set_framework_basis`        | `PUT /organizations/{…}/framework-scoping/{…}/basis`             |
| `set_target_maturity` | `scf_set_target_maturity`        | `PUT /organizations/{…}/scoped-controls/{…}/target-maturity`     |
| `set_materiality`     | `scf_set_control_materiality`    | `PUT /organizations/{…}/scoped-controls/{…}/materiality`         |
| `set_procedure`       | `scf_set_control_procedure`      | `PUT /organizations/{…}/scoped-controls/{…}/procedure-document`  |

### `scf_evidence_read` (group `evidence`, core)

| `method`                  | Was                                        | Route                                                         |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `list`                    | `scf_list_evidence`                        | `GET /organizations/{…}/evidence-tracking`                    |
| `get`                     | `scf_get_evidence`                         | `GET /organizations/{…}/evidence-tracking/{…}`                |
| `requiring_controls`      | `scf_get_evidence_requiring_controls`      | `(lib)`                                                       |
| `gaps`                    | `scf_list_evidence_gaps`                   | `GET /organizations/{…}/evidence-gaps`                        |
| `health`                  | `scf_get_evidence_health`                  | `GET /organizations/{…}/evidence-health`                      |
| `upcoming`                | `scf_get_upcoming_evidence`                | `GET /organizations/{…}/evidence-health/upcoming`             |
| `frequency_health`        | `scf_get_frequency_health`                 | `GET /organizations/{…}/evidence/frequency-health`            |
| `maturity_summary`        | `scf_get_evidence_maturity`                | `GET /organizations/{…}/evidence-maturity-summary`            |
| `item_maturity`           | `scf_get_evidence_item_maturity`           | `GET /organizations/{…}/evidence/{…}/maturity`                |
| `upgrade_recommendations` | `scf_get_evidence_upgrade_recommendations` | `GET /organizations/{…}/evidence/{…}/upgrade-recommendations` |
| `suggestions`             | `scf_get_evidence_suggestions`             | `GET /organizations/{…}/evidence/{…}/suggestions`             |

### `scf_evidence_write` (group `evidence`, core)

| `method`       | Was                         | Route                                             |
| -------------- | --------------------------- | ------------------------------------------------- |
| `create`       | `scf_create_evidence`       | `POST /organizations/{…}/evidence-tracking`       |
| `update`       | `scf_update_evidence`       | `POST /organizations/{…}/evidence-tracking`       |
| `batch_update` | `scf_batch_update_evidence` | `POST /organizations/{…}/evidence-tracking/batch` |

### `scf_evidence_file_read` (group `evidence`, core)

| `method`             | Was                                   | Route                                                      |
| -------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `list`               | `scf_list_evidence_files`             | `GET /organizations/{…}/evidence/{…}/files`                |
| `get`                | `scf_get_evidence_file`               | `GET /organizations/{…}/evidence/{…}/files/{…}`            |
| `validation`         | `scf_get_evidence_validation`         | `GET /organizations/{…}/evidence/{…}/files/{…}/validation` |
| `validation_summary` | `scf_get_evidence_validation_summary` | `GET /organizations/{…}/evidence/validation/summary`       |

### `scf_evidence_file_write` (group `evidence`, core)

| `method`     | Was                            | Route                                                     |
| ------------ | ------------------------------ | --------------------------------------------------------- |
| `review`     | `scf_review_evidence_file`     | `PATCH /organizations/{…}/evidence/{…}/files/{…}/review`  |
| `revalidate` | `scf_revalidate_evidence_file` | `POST /organizations/{…}/evidence/{…}/files/{…}/validate` |
| `delete`     | `scf_delete_evidence_file`     | `DELETE /organizations/{…}/evidence/{…}/files/{…}`        |

### `scf_list_evidence_tasks` (group `evidence`, core)

Unchanged: same name, no `method` parameter.

### `scf_evidence_task_write` (group `evidence`, core)

| `method`   | Was                          | Route                               |
| ---------- | ---------------------------- | ----------------------------------- |
| `create`   | `scf_create_evidence_task`   | `POST /evidence-tasks`              |
| `update`   | `scf_update_evidence_task`   | `PATCH /evidence-tasks/{…}`         |
| `complete` | `scf_complete_evidence_task` | `POST /evidence-tasks/{…}/complete` |

### `scf_assessment_read` (group `assessments`, core)

| `method`                  | Was                                      | Route                                                             |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `file_assessment`         | `scf_get_evidence_assessment`            | `GET /organizations/{…}/evidence/{…}/files/{…}/assessment`        |
| `file_summary`            | `scf_get_evidence_assessment_summary`    | `GET /organizations/{…}/evidence/assessment/summary`              |
| `review_queue`            | `scf_get_assessment_review_queue`        | `GET /organizations/{…}/evidence/assessment/review-queue`         |
| `list_windows`            | `scf_list_window_assessments`            | `GET /organizations/{…}/evidence/{…}/window-assessments`          |
| `window`                  | `scf_get_window_assessment`              | `GET /organizations/{…}/evidence/window-assessments/{…}`          |
| `window_versions`         | `scf_get_window_assessment_versions`     | `GET /organizations/{…}/evidence/window-assessments/{…}/versions` |
| `window_summary`          | `scf_get_window_assessment_summary`      | `GET /organizations/{…}/evidence/window-assessments/summary`      |
| `control_composite`       | `scf_get_control_assessment_composite`   | `GET /organizations/{…}/controls/{…}/assessment-composite`        |
| `list_control_composites` | `scf_list_control_assessment_composites` | `GET /organizations/{…}/controls/assessment-composites`           |

### `scf_assessment_write` (group `assessments`, core)

| `method`                | Was                                    | Route                                                                    |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `assess_file`           | `scf_trigger_evidence_assessment`      | `POST /organizations/{…}/evidence/{…}/files/{…}/assess`                  |
| `assess_files_bulk`     | `scf_bulk_assess_evidence`             | `POST /organizations/{…}/evidence/assess-bulk`                           |
| `review_file_verdict`   | `scf_review_evidence_assessment`       | `POST /organizations/{…}/evidence/{…}/files/{…}/assessment/review`       |
| `assess_window`         | `scf_trigger_window_assessment`        | `POST /organizations/{…}/evidence/{…}/assess-window`                     |
| `assess_windows_bulk`   | `scf_bulk_assess_windows`              | `POST /organizations/{…}/evidence/assess-windows-bulk`                   |
| `refresh_stale_windows` | `scf_refresh_stale_window_assessments` | `POST /organizations/{…}/evidence/window-assessments/refresh-stale`      |
| `review_window`         | `scf_review_window_assessment`         | `PUT /organizations/{…}/window-assessments/{…}/review`                   |
| `review_window_verdict` | `scf_review_window_assessment_verdict` | `POST /organizations/{…}/evidence/window-assessments/{…}/verdict/review` |

### `scf_risk_read` (group `risk`, core)

| `method`            | Was                         | Route                                          |
| ------------------- | --------------------------- | ---------------------------------------------- |
| `list`              | `scf_list_risks`            | `GET /organizations/{…}/risk-assessments`      |
| `get`               | `scf_get_risk`              | `GET /organizations/{…}/risk-assessments/{…}`  |
| `matrix`            | `scf_get_risk_matrix`       | `GET /organizations/{…}/risk-matrix`           |
| `summary`           | `scf_get_risk_summary`      | `GET /organizations/{…}/risk-summary`          |
| `profile`           | `scf_get_risk_profile`      | `GET /organizations/{…}/risk-profile`          |
| `for_control`       | `scf_get_risks_for_control` | `GET /organizations/{…}/risks-for-control/{…}` |
| `controls_for_risk` | `scf_get_controls_for_risk` | `GET /organizations/{…}/controls-for-risk/{…}` |

### `scf_risk_write` (group `risk`, core)

| `method` | Was                          | Route                                                    |
| -------- | ---------------------------- | -------------------------------------------------------- |
| `create` | `scf_create_risk`            | `POST /organizations/{…}/risk-assessments`               |
| `update` | `scf_update_risk_assessment` | `PATCH /organizations/{…}/risk-assessments/{…}`          |
| `delete` | `scf_delete_risk_assessment` | `DELETE /organizations/{…}/risk-assessments/{…}`         |
| `accept` | `scf_accept_risk`            | `PUT /organizations/{…}/risk-assessments/{…}/acceptance` |

### `scf_custom_risk_read` (group `risk`, core)

| `method`   | Was                             | Route                                              |
| ---------- | ------------------------------- | -------------------------------------------------- |
| `list`     | `scf_list_custom_risks`         | `GET /organizations/{…}/custom-risks`              |
| `controls` | `scf_list_custom_risk_controls` | `GET /organizations/{…}/custom-risks/{…}/controls` |

### `scf_custom_risk_write` (group `risk`, core)

| `method`         | Was                              | Route                                                     |
| ---------------- | -------------------------------- | --------------------------------------------------------- |
| `create`         | `scf_create_custom_risk`         | `POST /organizations/{…}/custom-risks`                    |
| `update`         | `scf_update_custom_risk`         | `PATCH /organizations/{…}/custom-risks/{…}`               |
| `delete`         | `scf_delete_custom_risk`         | `DELETE /organizations/{…}/custom-risks/{…}`              |
| `add_control`    | `scf_add_custom_risk_control`    | `POST /organizations/{…}/custom-risks/{…}/controls`       |
| `update_control` | `scf_update_custom_risk_control` | `PATCH /organizations/{…}/custom-risks/{…}/controls/{…}`  |
| `remove_control` | `scf_remove_custom_risk_control` | `DELETE /organizations/{…}/custom-risks/{…}/controls/{…}` |

### `scf_vendor_read` (group `vendors`, core)

| `method`                | Was                                | Route                                                       |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------- |
| `list`                  | `scf_list_vendors`                 | `GET /organizations/{…}/vendors`                            |
| `get`                   | `scf_get_vendor`                   | `GET /organizations/{…}/vendors/{…}`                        |
| `research`              | `scf_get_vendor_research`          | `GET /organizations/{…}/vendors/{…}/research/latest`        |
| `list_assessments`      | `scf_list_vendor_assessments`      | `GET /organizations/{…}/vendors/{…}/assessments`            |
| `assessment`            | `scf_get_vendor_assessment`        | `GET /organizations/{…}/vendors/{…}/assessments/{…}`        |
| `latest_assessment`     | `scf_get_latest_vendor_assessment` | `GET /organizations/{…}/vendors/{…}/assessments/latest`     |
| `assessment_status`     | `scf_get_vendor_assessment_status` | `GET /organizations/{…}/vendors/{…}/assessments/{…}/status` |
| `certifications`        | `scf_list_vendor_certifications`   | `GET /organizations/{…}/vendors/{…}/certifications`         |
| `compensating_controls` | `scf_list_compensating_controls`   | `GET /organizations/{…}/vendors/{…}/compensating-controls`  |
| `action_items`          | `scf_list_vendor_action_items`     | `(lib)`                                                     |

### `scf_vendor_write` (group `vendors`, core)

| `method`   | Was                             | Route                                                                                     |
| ---------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `create`   | `scf_create_vendor`             | `POST /organizations/{…}/vendors`                                                         |
| `update`   | `scf_update_vendor`             | `PATCH /organizations/{…}/vendors/{…}`                                                    |
| `research` | `scf_trigger_vendor_research`   | `POST /organizations/{…}/vendors/{…}/research`                                            |
| `assess`   | `scf_trigger_vendor_assessment` | `GET /organizations/{…}/vendors/{…} <br> POST /organizations/{…}/vendors/{…}/assessments` |

### `scf_vendor_record_write` (group `vendors`, core)

| `method`                      | Was                               | Route                                                             |
| ----------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `create_certification`        | `scf_create_vendor_certification` | `POST /organizations/{…}/vendors/{…}/certifications`              |
| `update_certification`        | `scf_update_vendor_certification` | `PATCH /organizations/{…}/vendors/{…}/certifications/{…}`         |
| `delete_certification`        | `scf_delete_vendor_certification` | `DELETE /organizations/{…}/vendors/{…}/certifications/{…}`        |
| `create_compensating_control` | `scf_create_compensating_control` | `POST /organizations/{…}/vendors/{…}/compensating-controls`       |
| `update_compensating_control` | `scf_update_compensating_control` | `PATCH /organizations/{…}/vendors/{…}/compensating-controls/{…}`  |
| `delete_compensating_control` | `scf_delete_compensating_control` | `DELETE /organizations/{…}/vendors/{…}/compensating-controls/{…}` |
| `create_action_item`          | `scf_create_vendor_action_item`   | `POST /organizations/{…}/vendors/{…}/action-items`                |
| `update_action_item`          | `scf_update_vendor_action_item`   | `PATCH /organizations/{…}/vendors/{…}/action-items/{…}`           |
| `delete_action_item`          | `scf_delete_vendor_action_item`   | `DELETE /organizations/{…}/vendors/{…}/action-items/{…}`          |

### `scf_system_read` (group `systems`, core)

| `method`                | Was                                | Route                                                        |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `list`                  | `scf_list_systems`                 | `GET /organizations/{…}/systems`                             |
| `get`                   | `scf_get_system`                   | `GET /organizations/{…}/systems/{…}`                         |
| `catalog_templates`     | `scf_list_system_catalog`          | `GET /system-catalog`                                        |
| `catalog_template`      | `scf_get_system_catalog_template`  | `GET /system-catalog/{…}`                                    |
| `capabilities`          | `scf_list_system_capabilities`     | `GET /organizations/{…}/systems/{…}/capabilities`            |
| `recipes`               | `scf_get_system_recipes`           | `GET /organizations/{…}/systems/{…}/recipes`                 |
| `recipe_status`         | `scf_get_recipe_generation_status` | `GET /organizations/{…}/systems/{…}/generate-recipes/status` |
| `evidence_capabilities` | `scf_list_capabilities`            | `GET /organizations/{…}/evidence-capabilities`               |
| `systems_for_evidence`  | `scf_get_systems_for_evidence`     | `GET /organizations/{…}/evidence-capabilities/{…}`           |

### `scf_system_write` (group `systems`, core)

| `method`            | Was                            | Route                                                   |
| ------------------- | ------------------------------ | ------------------------------------------------------- |
| `create`            | `scf_create_system`            | `POST /organizations/{…}/systems`                       |
| `update`            | `scf_update_system`            | `PATCH /organizations/{…}/systems/{…}`                  |
| `create_capability` | `scf_create_system_capability` | `POST /organizations/{…}/systems/{…}/capabilities`      |
| `update_capability` | `scf_update_system_capability` | `PATCH /organizations/{…}/systems/{…}/capabilities/{…}` |
| `generate_recipes`  | `scf_generate_system_recipes`  | `POST /organizations/{…}/systems/{…}/generate-recipes`  |

### `scf_capability_theme_read` (group `systems`, core)

| `method`           | Was                                         | Route                                                       |
| ------------------ | ------------------------------------------- | ----------------------------------------------------------- |
| `list`             | `scf_list_capability_themes`                | `GET /organizations/{…}/capability-themes`                  |
| `get`              | `scf_get_capability_theme`                  | `GET /organizations/{…}/capability-themes/{…}`              |
| `scorecard`        | `scf_get_capability_theme_scorecard`        | `GET /organizations/{…}/capability-themes/scorecard`        |
| `evidence_posture` | `scf_get_capability_theme_evidence_posture` | `GET /organizations/{…}/capability-themes/evidence-posture` |
| `controls`         | `scf_list_capability_theme_controls`        | `GET /organizations/{…}/capability-themes/{…}/controls`     |

### `scf_org_read` (group `organization`, core)

| `method`        | Was                      | Route                                         |
| --------------- | ------------------------ | --------------------------------------------- |
| `list`          | `scf_list_organizations` | `GET /organizations`                          |
| `get`           | `scf_get_organization`   | `GET /organizations/{…}`                      |
| `settings`      | `scf_get_org_settings`   | `GET /organizations/{…}/settings`             |
| `members`       | `scf_list_members`       | `GET /organizations/{…}/members`              |
| `audit_log`     | `scf_get_audit_log`      | `GET /organizations/{…}/audit-log`            |
| `change_cursor` | `scf_get_change_cursor`  | `GET /organizations/{…}/changes/cursor`       |
| `work_queue`    | `scf_get_org_work_queue` | `GET /organizations/{…}/dashboard/work-queue` |

### `scf_update_org_settings` (group `organization`, core)

Unchanged: same name, no `method` parameter.

### `scf_user_read` (group `organization`, core)

| `method`        | Was                     | Route                     |
| --------------- | ----------------------- | ------------------------- |
| `me`            | `scf_get_current_user`  | `GET /users/me`           |
| `work_queue`    | `scf_get_work_queue`    | `GET /users/me/dashboard` |
| `notifications` | `scf_get_notifications` | `GET /notifications`      |

### `scf_mark_notifications_read` (group `organization`, core)

Unchanged: same name, no `method` parameter.

### `scf_team_read` (group `teams`, load on demand)

| `method`      | Was                         | Route                                     |
| ------------- | --------------------------- | ----------------------------------------- |
| `list`        | `scf_list_teams`            | `GET /organizations/{…}/teams`            |
| `get`         | `scf_get_team`              | `GET /organizations/{…}/teams/{…}`        |
| `functions`   | `scf_list_functions`        | `GET /functions`                          |
| `assignments` | `scf_list_team_assignments` | `GET /organizations/{…}/team-assignments` |

### `scf_team_write` (group `teams`, load on demand)

| `method`                   | Was                                 | Route                                             |
| -------------------------- | ----------------------------------- | ------------------------------------------------- |
| `create`                   | `scf_create_team`                   | `POST /organizations/{…}/teams`                   |
| `update`                   | `scf_update_team`                   | `PATCH /organizations/{…}/teams/{…}`              |
| `add_member`               | `scf_add_team_member`               | `POST /organizations/{…}/teams/{…}/members`       |
| `remove_member`            | `scf_remove_team_member`            | `DELETE /organizations/{…}/teams/{…}/members/{…}` |
| `create_assignment`        | `scf_create_team_assignment`        | `POST /organizations/{…}/team-assignments`        |
| `batch_create_assignments` | `scf_batch_create_team_assignments` | `POST /organizations/{…}/team-assignments/batch`  |
| `delete_assignment`        | `scf_delete_team_assignment`        | `DELETE /organizations/{…}/team-assignments/{…}`  |

### `scf_collaboration_read` (group `collaboration`, load on demand)

| `method`      | Was                    | Route              |
| ------------- | ---------------------- | ------------------ |
| `assignments` | `scf_list_assignments` | `GET /assignments` |
| `comments`    | `scf_list_comments`    | `GET /comments`    |

### `scf_collaboration_write` (group `collaboration`, load on demand)

| `method`            | Was                     | Route                     |
| ------------------- | ----------------------- | ------------------------- |
| `create_assignment` | `scf_create_assignment` | `POST /assignments`       |
| `delete_assignment` | `scf_delete_assignment` | `DELETE /assignments/{…}` |
| `create_comment`    | `scf_create_comment`    | `POST /comments`          |
| `update_comment`    | `scf_update_comment`    | `PATCH /comments/{…}`     |
| `delete_comment`    | `scf_delete_comment`    | `DELETE /comments/{…}`    |

### `scf_document_read` (group `documents`, load on demand)

| `method`            | Was                                  | Route                                                         |
| ------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `list`              | `scf_list_documents`                 | `GET /organizations/{…}/documents`                            |
| `get`               | `scf_get_document`                   | `GET /organizations/{…}/documents/{…}`                        |
| `export`            | `scf_export_document`                | `GET /organizations/{…}/documents/{…}/export`                 |
| `preview`           | `scf_preview_document`               | `GET /organizations/{…}/documents/{…}/preview`                |
| `history`           | `scf_get_document_history`           | `GET /organizations/{…}/documents/{…}/history`                |
| `section_generated` | `scf_get_document_section_generated` | `GET /organizations/{…}/documents/{…}/sections/{…}/generated` |
| `generation_status` | `scf_get_document_generation_status` | `GET /organizations/{…}/documents/generation-status`          |
| `settings`          | `scf_get_document_settings`          | `GET /organizations/{…}/documents/settings`                   |
| `domains`           | `scf_list_document_domains`          | `GET /organizations/{…}/documents/domains`                    |
| `generators`        | `scf_list_document_generators`       | `GET /organizations/{…}/documents/generators`                 |

### `scf_document_write` (group `documents`, load on demand)

| `method`          | Was                            | Route                                                        |
| ----------------- | ------------------------------ | ------------------------------------------------------------ |
| `generate`        | `scf_generate_documents`       | `POST /organizations/{…}/documents/generate`                 |
| `transition`      | `scf_transition_document`      | `POST /organizations/{…}/documents/{…}/transition`           |
| `update_section`  | `scf_update_document_section`  | `PUT /organizations/{…}/documents/{…}/sections/{…}`          |
| `resolve_section` | `scf_resolve_document_section` | `POST /organizations/{…}/documents/{…}/sections/{…}/resolve` |
| `update_settings` | `scf_update_document_settings` | `PUT /organizations/{…}/documents/settings`                  |

### `scf_engagement_read` (group `engagements`, load on demand)

| `method`       | Was                               | Route                                                 |
| -------------- | --------------------------------- | ----------------------------------------------------- |
| `list`         | `scf_list_engagements`            | `GET /organizations/{…}/engagements`                  |
| `get`          | `scf_get_engagement`              | `GET /organizations/{…}/engagements/{…}`              |
| `mine`         | `scf_list_my_engagements`         | `GET /my-engagements`                                 |
| `scope`        | `scf_get_engagement_scope`        | `GET /organizations/{…}/engagements/{…}/scope`        |
| `presentation` | `scf_get_engagement_presentation` | `GET /organizations/{…}/engagements/{…}/presentation` |
| `auditors`     | `scf_list_engagement_auditors`    | `GET /organizations/{…}/engagements/{…}/auditors`     |
| `queries`      | `scf_list_engagement_queries`     | `GET /organizations/{…}/engagements/{…}/queries`      |
| `query`        | `scf_get_engagement_query`        | `GET /organizations/{…}/engagements/{…}/queries/{…}`  |

### `scf_engagement_write` (group `engagements`, load on demand)

| `method`              | Was                                  | Route                                                           |
| --------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `create`              | `scf_create_engagement`              | `POST /organizations/{…}/engagements`                           |
| `update`              | `scf_update_engagement`              | `PATCH /organizations/{…}/engagements/{…}`                      |
| `delete`              | `scf_delete_engagement`              | `DELETE /organizations/{…}/engagements/{…}`                     |
| `add_auditor`         | `scf_add_engagement_auditor`         | `POST /organizations/{…}/engagements/{…}/auditors`              |
| `remove_auditor`      | `scf_remove_engagement_auditor`      | `DELETE /organizations/{…}/engagements/{…}/auditors/{…}`        |
| `create_query`        | `scf_create_engagement_query`        | `POST /organizations/{…}/engagements/{…}/queries`               |
| `update_query_status` | `scf_update_engagement_query_status` | `PATCH /organizations/{…}/engagements/{…}/queries/{…}`          |
| `respond_to_query`    | `scf_respond_to_engagement_query`    | `POST /organizations/{…}/engagements/{…}/queries/{…}/responses` |

### `scf_assurance_read` (group `assurance`, load on demand)

| `method`                     | Was                                  | Route                                              |
| ---------------------------- | ------------------------------------ | -------------------------------------------------- |
| `list_deficiencies`          | `scf_list_deficiencies`              | `GET /organizations/{…}/deficiencies`              |
| `deficiency`                 | `scf_get_deficiency`                 | `GET /organizations/{…}/deficiencies/{…}`          |
| `deficiency_summary`         | `scf_get_deficiency_summary`         | `GET /organizations/{…}/deficiencies/summary`      |
| `list_compensating_controls` | `scf_list_org_compensating_controls` | `GET /organizations/{…}/compensating-controls`     |
| `compensating_control`       | `scf_get_org_compensating_control`   | `GET /organizations/{…}/compensating-controls/{…}` |
| `control_validations`        | `scf_list_control_validations`       | `GET /organizations/{…}/control-validations`       |
| `list_posture_snapshots`     | `scf_list_posture_snapshots`         | `GET /organizations/{…}/posture-snapshots`         |
| `posture_snapshot`           | `scf_get_posture_snapshot`           | `GET /organizations/{…}/posture-snapshots/{…}`     |
| `list_capability_tests`      | `scf_list_capability_tests`          | `GET /organizations/{…}/capability-tests`          |
| `capability_test`            | `scf_get_capability_test`            | `GET /organizations/{…}/capability-tests/{…}`      |

### `scf_assurance_write` (group `assurance`, load on demand)

| `method`                      | Was                                   | Route                                                    |
| ----------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `create_deficiency`           | `scf_create_deficiency`               | `POST /organizations/{…}/deficiencies`                   |
| `update_deficiency`           | `scf_update_deficiency`               | `PATCH /organizations/{…}/deficiencies/{…}`              |
| `create_compensating_control` | `scf_create_org_compensating_control` | `POST /organizations/{…}/compensating-controls`          |
| `update_compensating_control` | `scf_update_org_compensating_control` | `PATCH /organizations/{…}/compensating-controls/{…}`     |
| `record_control_validation`   | `scf_record_control_validation`       | `POST /organizations/{…}/scoped-controls/{…}/validation` |
| `take_posture_snapshot`       | `scf_take_posture_snapshot`           | `POST /organizations/{…}/posture-snapshots`              |
| `create_capability_test`      | `scf_create_capability_test`          | `POST /organizations/{…}/capability-tests`               |
| `update_capability_test`      | `scf_update_capability_test`          | `PATCH /organizations/{…}/capability-tests/{…}`          |
| `add_capability_test_finding` | `scf_add_capability_test_finding`     | `POST /organizations/{…}/capability-tests/{…}/findings`  |

### `scf_catalog_reconciliation_read` (group `catalog-reconciliation`, load on demand)

| `method`    | Was                                     | Route                                                    |
| ----------- | --------------------------------------- | -------------------------------------------------------- |
| `status`    | `scf_get_catalog_reconciliation_status` | `GET /organizations/{…}/catalog-reconciliation/status`   |
| `changelog` | `scf_get_catalog_changelog`             | `GET /organizations/{…}/catalog-changelog`               |
| `list_runs` | `scf_list_reconciliation_runs`          | `GET /organizations/{…}/catalog-reconciliation/runs`     |
| `run`       | `scf_get_reconciliation_run`            | `GET /organizations/{…}/catalog-reconciliation/runs/{…}` |

### `scf_catalog_reconciliation_write` (group `catalog-reconciliation`, load on demand)

| `method`      | Was                                   | Route                                                              |
| ------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `preview`     | `scf_preview_catalog_reconciliation`  | `POST /organizations/{…}/catalog-reconciliation/preview`           |
| `set_actions` | `scf_set_reconciliation_actions`      | `PUT /organizations/{…}/catalog-reconciliation/runs/{…}/actions`   |
| `apply`       | `scf_apply_catalog_reconciliation`    | `POST /organizations/{…}/catalog-reconciliation/runs/{…}/apply`    |
| `cancel`      | `scf_cancel_catalog_reconciliation`   | `POST /organizations/{…}/catalog-reconciliation/runs/{…}/cancel`   |
| `rollback`    | `scf_rollback_catalog_reconciliation` | `POST /organizations/{…}/catalog-reconciliation/runs/{…}/rollback` |

### `scf_webhook_read` (group `webhooks`, load on demand)

| `method`     | Was                           | Route                                                     |
| ------------ | ----------------------------- | --------------------------------------------------------- |
| `list`       | `scf_list_webhooks`           | `GET /organizations/{…}/webhook-endpoints`                |
| `get`        | `scf_get_webhook`             | `GET /organizations/{…}/webhook-endpoints/{…}`            |
| `deliveries` | `scf_list_webhook_deliveries` | `GET /organizations/{…}/webhook-endpoints/{…}/deliveries` |

### `scf_webhook_write` (group `webhooks`, load on demand)

| `method`        | Was                         | Route                                                         |
| --------------- | --------------------------- | ------------------------------------------------------------- |
| `create`        | `scf_create_webhook`        | `POST /organizations/{…}/webhook-endpoints`                   |
| `rotate_secret` | `scf_rotate_webhook_secret` | `POST /organizations/{…}/webhook-endpoints/{…}/rotate-secret` |
| `delete`        | `scf_delete_webhook`        | `DELETE /organizations/{…}/webhook-endpoints/{…}`             |

### `scf_journey_read` (group `journey`, load on demand)

| `method`    | Was                          | Route                                      |
| ----------- | ---------------------------- | ------------------------------------------ |
| `get`       | `scf_get_journey`            | `GET /organizations/{…}/journey`           |
| `templates` | `scf_list_journey_templates` | `GET /organizations/{…}/journey/templates` |

### `scf_journey_write` (group `journey`, load on demand)

| `method`       | Was                        | Route                                               |
| -------------- | -------------------------- | --------------------------------------------------- |
| `import`       | `scf_import_journey`       | `POST /organizations/{…}/journey/import`            |
| `attest_stage` | `scf_attest_journey_stage` | `POST /organizations/{…}/journey/stages/{…}/attest` |
