# Migrating to the `scf_*` tool prefix (v1.0)

v1.0 renames every tool with an `scf_` prefix so tool names don't collide with other MCP servers installed alongside this one. The rename is a clean break — there are no deprecation aliases. If your prompts, automations, or agent scripts reference tool names directly, update them in one pass when you bump the server version.

## Why

MCP clients show a flat tool list across every server the user has installed. Generic names like `list_controls`, `get_risk`, or `create_vendor` collide with tools from unrelated servers and weaken attribution. Prefixing puts the platform on every tool surface and guarantees uniqueness.

## What changed

- Every tool name gains the `scf_` prefix (e.g., `list_controls` → `scf_list_controls`).
- Tool parameters, return shapes, handlers, and HTTP endpoints are unchanged.
- Tool descriptions are unchanged.
- The server `name` (`mcp-server-scf`) and MCP initialize handshake are unchanged.

## What to update

1. **MCP client config** — nothing to change. `SCF_API_KEY`, `SCF_API_URL`, and the `mcp-server-scf` binary are the same.
2. **Hand-written prompts** — replace the old tool name with the `scf_` form.
3. **Agent scripts / automations** calling tools by name — same.
4. **Prompt templates in internal documentation** — same.

## Tool name mapping

### capabilities

| Before (0.x)                            | After (1.0)                                 |
| --------------------------------------- | ------------------------------------------- |
| `list_capability_themes`                | `scf_list_capability_themes`                |
| `list_capabilities`                     | `scf_list_capabilities`                     |
| `list_systems`                          | `scf_list_systems`                          |
| `create_system`                         | `scf_create_system`                         |
| `update_system`                         | `scf_update_system`                         |
| `get_capability_theme_scorecard`        | `scf_get_capability_theme_scorecard`        |
| `get_capability_theme`                  | `scf_get_capability_theme`                  |
| `list_capability_theme_controls`        | `scf_list_capability_theme_controls`        |
| `get_capability_theme_evidence_posture` | `scf_get_capability_theme_evidence_posture` |

### catalog

| Before (0.x)                 | After (1.0)                      |
| ---------------------------- | -------------------------------- |
| `list_controls`              | `scf_list_controls`              |
| `get_control`                | `scf_get_control`                |
| `list_frameworks`            | `scf_list_frameworks`            |
| `list_domains`               | `scf_list_domains`               |
| `list_evidence_catalog`      | `scf_list_evidence_catalog`      |
| `list_assessment_objectives` | `scf_list_assessment_objectives` |

### evidence

| Before (0.x)                      | After (1.0)                           |
| --------------------------------- | ------------------------------------- |
| `list_evidence`                   | `scf_list_evidence`                   |
| `create_evidence`                 | `scf_create_evidence`                 |
| `get_evidence_maturity`           | `scf_get_evidence_maturity`           |
| `list_evidence_files`             | `scf_list_evidence_files`             |
| `get_evidence_file`               | `scf_get_evidence_file`               |
| `update_evidence`                 | `scf_update_evidence`                 |
| `get_evidence_validation`         | `scf_get_evidence_validation`         |
| `revalidate_evidence_file`        | `scf_revalidate_evidence_file`        |
| `get_evidence_validation_summary` | `scf_get_evidence_validation_summary` |
| `trigger_evidence_assessment`     | `scf_trigger_evidence_assessment`     |
| `get_evidence_assessment`         | `scf_get_evidence_assessment`         |
| `bulk_assess_evidence`            | `scf_bulk_assess_evidence`            |
| `get_evidence_assessment_summary` | `scf_get_evidence_assessment_summary` |
| `list_evidence_tasks`             | `scf_list_evidence_tasks`             |
| `trigger_window_assessment`       | `scf_trigger_window_assessment`       |
| `list_window_assessments`         | `scf_list_window_assessments`         |
| `get_window_assessment`           | `scf_get_window_assessment`           |
| `bulk_assess_windows`             | `scf_bulk_assess_windows`             |
| `get_window_assessment_summary`   | `scf_get_window_assessment_summary`   |

### organization

| Before (0.x)         | After (1.0)              |
| -------------------- | ------------------------ |
| `get_current_user`   | `scf_get_current_user`   |
| `list_organizations` | `scf_list_organizations` |
| `get_organization`   | `scf_get_organization`   |
| `list_members`       | `scf_list_members`       |
| `get_work_queue`     | `scf_get_work_queue`     |
| `get_audit_log`      | `scf_get_audit_log`      |
| `get_notifications`  | `scf_get_notifications`  |

### risk

| Before (0.x)                 | After (1.0)                      |
| ---------------------------- | -------------------------------- |
| `list_risks`                 | `scf_list_risks`                 |
| `get_risk`                   | `scf_get_risk`                   |
| `create_risk`                | `scf_create_risk`                |
| `get_risk_matrix`            | `scf_get_risk_matrix`            |
| `get_risk_summary`           | `scf_get_risk_summary`           |
| `list_custom_risks`          | `scf_list_custom_risks`          |
| `create_custom_risk`         | `scf_create_custom_risk`         |
| `update_custom_risk`         | `scf_update_custom_risk`         |
| `delete_custom_risk`         | `scf_delete_custom_risk`         |
| `list_custom_risk_controls`  | `scf_list_custom_risk_controls`  |
| `add_custom_risk_control`    | `scf_add_custom_risk_control`    |
| `remove_custom_risk_control` | `scf_remove_custom_risk_control` |

### scoped-controls

| Before (0.x)            | After (1.0)                 |
| ----------------------- | --------------------------- |
| `list_scoped_controls`  | `scf_list_scoped_controls`  |
| `get_scoped_control`    | `scf_get_scoped_control`    |
| `update_scoped_control` | `scf_update_scoped_control` |
| `get_scoping_stats`     | `scf_get_scoping_stats`     |
| `scope_framework`       | `scf_scope_framework`       |
| `batch_update_controls` | `scf_batch_update_controls` |

### vendors

| Before (0.x)              | After (1.0)                   |
| ------------------------- | ----------------------------- |
| `list_vendors`            | `scf_list_vendors`            |
| `get_vendor`              | `scf_get_vendor`              |
| `create_vendor`           | `scf_create_vendor`           |
| `update_vendor`           | `scf_update_vendor`           |
| `trigger_vendor_research` | `scf_trigger_vendor_research` |
| `get_vendor_research`     | `scf_get_vendor_research`     |
| `trigger_dpsia`           | `scf_trigger_dpsia`           |

### webhooks

| Before (0.x)              | After (1.0)                   |
| ------------------------- | ----------------------------- |
| `create_webhook`          | `scf_create_webhook`          |
| `list_webhooks`           | `scf_list_webhooks`           |
| `get_webhook`             | `scf_get_webhook`             |
| `delete_webhook`          | `scf_delete_webhook`          |
| `rotate_webhook_secret`   | `scf_rotate_webhook_secret`   |
| `list_webhook_deliveries` | `scf_list_webhook_deliveries` |

## Why no deprecation aliases?

Shipping both old and new names for a release would double the tool count surfaced to every client (from 72 to 144), crowding autocomplete and diluting the attribution benefit. The rename is mechanical — a one-pass find-and-replace against the tables above — so the cost of aliasing outweighs the value.

If you need a gradual cutover, pin to `mcp-server-scf@0.6.x` until your prompts and scripts are updated, then upgrade to `1.x`.
