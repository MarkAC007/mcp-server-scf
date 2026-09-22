# Control Scoping tools

Track implementation status of SCF controls scoped to a specific organization. Supports an 8-state implementation workflow (`not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred`) and a 6-level maturity scale (`L0`–`L5`).

Source: [`src/tools/scoped-controls.ts`](../../src/tools/scoped-controls.ts).

---

## `scf_list_scoped_controls`

List controls scoped to the organization with implementation status. Filter by scope status, domain, framework, CSF function, weighting, or free-text search. Paginated.

| Parameter                | Type    | Required | Description                                                                                                                                                                                                                                |
| ------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `org_id`                 | string  | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                                                                                                                                                                                 |
| `scope_status`           | string  | No       | `in_scope` (selected only), `out_of_scope`, `all` (default)                                                                                                                                                                                |
| `domain`                 | string  | No       | Filter by SCF domain (e.g., `GOV`, `AST`, `IAC`)                                                                                                                                                                                           |
| `framework`              | string  | No       | Filter by framework mapping                                                                                                                                                                                                                |
| `csf_function`           | string  | No       | Filter by NIST CSF function                                                                                                                                                                                                                |
| `control_weighting`      | number  | No       | Filter by control weighting (0–10)                                                                                                                                                                                                         |
| `search`                 | string  | No       | Search term for control ID, name, or description                                                                                                                                                                                           |
| `team_id`                | string  | No       | Filter to controls this team is assigned to, accountable or consulted — get from `scf_list_teams`                                                                                                                                          |
| `my_teams`               | boolean | No       | Controls assigned to any team the caller belongs to (default `false`); intersects with `team_id`. 'The caller' is the API key's identity — on a self-hosted instance a service account on no team, so this returns nothing; use `team_id`. |
| `function_id`            | string  | No       | Controls assigned to any team aligned to this function — get from `scf_list_functions`                                                                                                                                                     |
| `accountable_owner_type` | string  | No       | Accountable team's primary owner: `internal` or `external_contractor`                                                                                                                                                                      |
| `limit`                  | number  | No       | Number of results to return (1–200, default 50)                                                                                                                                                                                            |
| `offset`                 | number  | No       | Number of results to skip for pagination (default 0)                                                                                                                                                                                       |

---

## `scf_get_scoped_control`

Get one scoped control in detail: owner, implementation notes, evidence links, and audit history. Identify by scf_id, not by UUID.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |
| `scf_id`  | string | Yes      | SCF control identifier (e.g., `AST-01`) — NOT the UUID     |

---

## `scf_update_scoped_control`

Update a scoped control's implementation fields (write — editor+ role). Identify by scf_id, not UUID. Only provided fields are applied.

| Parameter               | Type   | Required | Description                                                                                                                      |
| ----------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`                | string | Yes      | Organization ID (UUID)                                                                                                           |
| `scf_id`                | string | Yes      | SCF control identifier (e.g., `AST-01`) — NOT the UUID                                                                           |
| `implementation_status` | string | No       | One of: `not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred`    |
| `priority`              | string | No       | Implementation priority (e.g., `high`, `medium`, `low`)                                                                          |
| `maturity_level`        | string | No       | `L0`=Not Performed, `L1`=Performed, `L2`=Planned, `L3`=Well Defined, `L4`=Quantitatively Controlled, `L5`=Continuously Improving |
| `owner`                 | string | No       | Control owner (person accountable)                                                                                               |
| `assigned_to`           | string | No       | Assignee (person responsible for implementation)                                                                                 |
| `implementation_notes`  | string | No       | Implementation notes and context                                                                                                 |
| `target_date`           | string | No       | Target completion date (`YYYY-MM-DD`)                                                                                            |
| `completion_date`       | string | No       | Actual completion date (`YYYY-MM-DD`)                                                                                            |
| `selection_reason`      | string | No       | Justification for scoping selection or status (required for `not_applicable`, `deferred`)                                        |

---

## `scf_get_scoping_stats`

Get the organization's implementation statistics: counts by status, overall completion percentage, and per-framework coverage breakdown.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_scope_framework`

Bulk-scope every control mapped to a framework into the organization (write — editor+ role). Creates a scoped-control entry for each control in the framework.

| Parameter      | Type   | Required | Description                                    |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `org_id`       | string | Yes      | Organization ID (UUID)                         |
| `framework_id` | string | Yes      | Framework ID to scope (e.g., `nist-800-53-r5`) |

---

## `scf_batch_update_controls`

Batch-update up to 500 scoped controls in one transaction (write — editor+ role). Each operation identifies its target by scf_id; status values are lowercase.

| Parameter    | Type   | Required | Description                                       |
| ------------ | ------ | -------- | ------------------------------------------------- |
| `org_id`     | string | Yes      | Organization ID (UUID)                            |
| `operations` | array  | Yes      | 1–500 operations (see per-operation fields below) |

Each operation accepts:

| Field                   | Type    | Required | Description                             |
| ----------------------- | ------- | -------- | --------------------------------------- |
| `scf_id`                | string  | Yes      | SCF control identifier (e.g., `AST-01`) |
| `selected`              | boolean | No       | Whether the control is in scope         |
| `implementation_status` | string  | No       | Implementation status (lowercase)       |
| `selection_reason`      | string  | No       | Justification for selection or status   |
| `priority`              | string  | No       | Implementation priority                 |
| `owner`                 | string  | No       | Control owner                           |
| `assigned_to`           | string  | No       | Assignee                                |
| `maturity_level`        | string  | No       | Maturity level (`L0`–`L5`)              |
| `target_date`           | string  | No       | Target date (`YYYY-MM-DD`)              |
| `completion_date`       | string  | No       | Completion date (`YYYY-MM-DD`)          |
| `implementation_notes`  | string  | No       | Implementation notes                    |

---

## `scf_bulk_unscope_framework`

Remove from scope every control mapped only to the given frameworks (destructive write — editor role). Controls shared with another in-scope framework are kept; notes and status survive.

| Parameter        | Type     | Required | Description                                                                         |
| ---------------- | -------- | -------- | ----------------------------------------------------------------------------------- |
| `org_id`         | string   | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                          |
| `frameworks`     | string[] | Yes      | Framework slugs to remove (e.g., `iso_27017_2015`) — get from `scf_list_frameworks` |
| `removal_reason` | string   | No       | Why these controls leave scope — recorded in the audit trail                        |

---

## Example prompts

- "Show me our organization's control implementation progress."
- "Scope the ISO 27001 framework for my org."
- "Batch update all access-control controls to `in_progress`."
- "Get the implementation status of `AST-01`."

---

## `scf_get_framework_scope_summary`

Get framework coverage and selection state in one view (read — viewer role): which frameworks are selected and how their controls sit against the scope. Read side of scoping; changing it is elsewhere.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_preview_framework_scope_change`

Preview what adding or removing frameworks would do to the scope WITHOUT applying it (read — viewer role). Returns the controls that would enter or leave, so the blast radius is known beforehand.

| Parameter    | Type     | Required | Description                                                |
| ------------ | -------- | -------- | ---------------------------------------------------------- |
| `org_id`     | string   | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |
| `operation`  | string   | Yes      | `add` or `remove`                                          |
| `frameworks` | string[] | Yes      | Framework slugs to model — get from `scf_list_frameworks`  |

Run this before `scf_scope_framework` or `scf_bulk_unscope_framework`.

---

## `scf_set_scope_override`

Force one control in or out of scope whatever its frameworks imply (write — editor+). `include`/`exclude` pin it; `inherit` clears the override back to the framework rollup. Scope only, not status.

| Parameter | Type   | Required | Description                                                                      |
| --------- | ------ | -------- | -------------------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                       |
| `scf_id`  | string | Yes      | SCF control identifier in DOMAIN-NN format — NOT the UUID                        |
| `action`  | string | Yes      | `include`, `exclude`, or `inherit` (`inherit` also discards the stored `reason`) |
| `reason`  | string | No       | Why this control is overridden — recorded in the audit trail (≤2000 chars)       |

`inherit` is not a no-op: it clears a previously set override and hands the control back to the framework rollup. It also discards the recorded `reason` — the rationale survives only in the audit trail.
