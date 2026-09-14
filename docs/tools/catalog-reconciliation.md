# Catalog reconciliation tools

Move an organization onto a newer SCF catalog version, deliberately.

When the platform's catalog advances, an organization does not follow automatically —
its scoped controls, evidence and mappings stay where they are until someone reconciles
them. Reconciliation is a four-step loop: **preview** the diff, **decide** what happens to
each deprecated entity, **apply**, and — if it went wrong — **roll back**.

Each deprecated entity gets one of three decisions: `migrate` (move to a named successor),
`retain` (keep it scoped despite deprecation), or `retire_only` (drop it).

The 9 tools split into three concerns:

1. **Position and history** — `scf_get_catalog_reconciliation_status`, `scf_get_catalog_changelog`
2. **Plan** — `scf_preview_catalog_reconciliation`, `scf_list_reconciliation_runs`, `scf_get_reconciliation_run`, `scf_set_reconciliation_actions`
3. **Execute** — `scf_apply_catalog_reconciliation`, `scf_rollback_catalog_reconciliation`, `scf_cancel_catalog_reconciliation`

> **Two guards worth knowing.** `scf_apply_catalog_reconciliation` requires
> `expected_to_version`, so a preview computed against a version that has since moved is
> refused rather than applied. `scf_rollback_catalog_reconciliation` requires the exact
> confirmation phrase the run detail states.

> **`scf_set_reconciliation_actions` replaces the whole action list.** Send every decision,
> not a delta — a partial list overwrites the rest.

Source: [`src/tools/catalog-reconciliation.ts`](../../src/tools/catalog-reconciliation.ts).

---

## `scf_get_catalog_reconciliation_status`

Get this organization's catalog position (read — viewer role): its catalog version, the platform's current version, and whether reconciliation is due or in flight. Start here.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_preview_catalog_reconciliation`

Create a reconciliation preview run (write — admin role): what moving to the target catalog version would do to scoped controls, evidence and mappings. Changes nothing until apply.

| Parameter        | Type   | Required | Description                                                                      |
| ---------------- | ------ | -------- | -------------------------------------------------------------------------------- |
| `org_id`         | string | Yes      | Organization UUID — obtain from scf_list_organizations                           |
| `target_version` | string | No       | Catalog version to reconcile towards; omit to use the platform's current version |

---

## `scf_list_reconciliation_runs`

List this organization's catalog reconciliation runs, newest first (read — viewer role), with each run's status and target version.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `limit`   | number | No       | Page size, 1–100 (default 20)                          |
| `offset`  | number | No       | Rows to skip for pagination (default 0)                |

---

## `scf_get_reconciliation_run`

Get one reconciliation run in detail (read — viewer role): the computed diff, every deprecated entity needing a decision, and the planned action currently recorded against each.

| Parameter | Type   | Required | Description                                                                                              |
| --------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                   |
| `run_id`  | string | Yes      | Reconciliation run UUID — obtain from scf_list_reconciliation_runs or scf_preview_catalog_reconciliation |

---

## `scf_set_reconciliation_actions`

Record decisions for a reconciliation run (write — admin role). REPLACES the run's planned actions, so send the complete list. Each deprecated entity gets migrate, retain or retire_only.

| Parameter                 | Type   | Required | Description                                                                                              |
| ------------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `org_id`                  | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                   |
| `run_id`                  | string | Yes      | Reconciliation run UUID — obtain from scf_list_reconciliation_runs or scf_preview_catalog_reconciliation |
| `actions`                 | array  | Yes      | The complete set of planned actions for this run — partial lists overwrite the rest                      |
| `confirmed_framework_ids` | array  | No       | On a first reconciliation, the confirmed framework list this organization is scoping to                  |

---

## `scf_apply_catalog_reconciliation`

Apply a previewed reconciliation run (write — admin role). Asynchronous. The run must be 'previewed' and expected_to_version must match, so a stale preview is refused rather than applied.

| Parameter             | Type   | Required | Description                                                                                              |
| --------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `org_id`              | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                   |
| `run_id`              | string | Yes      | Reconciliation run UUID — obtain from scf_list_reconciliation_runs or scf_preview_catalog_reconciliation |
| `expected_to_version` | string | Yes      | The target catalog version from the run detail — guards against applying a stale preview                 |

---

## `scf_rollback_catalog_reconciliation`

Roll an applied reconciliation run back (destructive write — admin role). Asynchronous, and requires the typed confirmation string the run detail states.

| Parameter      | Type   | Required | Description                                                                                              |
| -------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `org_id`       | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                   |
| `run_id`       | string | Yes      | Reconciliation run UUID — obtain from scf_list_reconciliation_runs or scf_preview_catalog_reconciliation |
| `confirm_text` | string | Yes      | The exact confirmation phrase the platform requires for this rollback                                    |

---

## `scf_cancel_catalog_reconciliation`

Cancel a reconciliation run that has not been applied (write — admin role). The organization stays on its current catalog version.

| Parameter | Type   | Required | Description                                                                                              |
| --------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                   |
| `run_id`  | string | Yes      | Reconciliation run UUID — obtain from scf_list_reconciliation_runs or scf_preview_catalog_reconciliation |

---

## `scf_get_catalog_changelog`

Get this organization's catalog changelog (read — viewer role): what changed across reconciliations, newest first. Answers 'when did this control change, and what did we decide?'

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `limit`   | number | No       | Page size, 1–500 (default 50)                          |
| `offset`  | number | No       | Rows to skip for pagination (default 0)                |

---
