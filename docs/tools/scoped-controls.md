# Control Scoping tools

Track implementation status of SCF controls scoped to a specific organization. Supports an 8-state implementation workflow (`not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred`) and a 6-level maturity scale (`L0`–`L5`).

Source: [`src/tools/scoped-controls.ts`](../../src/tools/scoped-controls.ts).

---

## `scf_list_scoped_controls`

List controls scoped to your organization with their implementation status. Supports filtering by scope status, domain, framework, CSF function, control weighting, and search. Use `scope_status='in_scope'` to return only controls where `selected=True`.

| Parameter           | Type   | Required | Description                                                 |
| ------------------- | ------ | -------- | ----------------------------------------------------------- |
| `org_id`            | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`  |
| `scope_status`      | string | No       | `in_scope` (selected only), `out_of_scope`, `all` (default) |
| `domain`            | string | No       | Filter by SCF domain (e.g., `GOV`, `AST`, `IAC`)            |
| `framework`         | string | No       | Filter by framework mapping                                 |
| `csf_function`      | string | No       | Filter by NIST CSF function                                 |
| `control_weighting` | number | No       | Filter by control weighting (0–10)                          |
| `search`            | string | No       | Search term for control ID, name, or description            |
| `limit`             | number | No       | Number of results to return (1–200, default 50)             |
| `offset`            | number | No       | Number of results to skip for pagination (default 0)        |

---

## `scf_get_scoped_control`

Get detailed implementation status of a specific scoped control, including owner, notes, evidence links, and audit history. Identify by `scf_id` (e.g., `AST-01`), not by UUID.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |
| `scf_id`  | string | Yes      | SCF control identifier (e.g., `AST-01`) — NOT the UUID     |

---

## `scf_update_scoped_control`

Update a scoped control's implementation tracking fields. Status values are lowercase. Maturity uses the `L0`–`L5` prefix format. All fields are optional — only provided fields are updated.

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

Get implementation statistics for an organization — counts by status, completion percentage, and framework coverage breakdown.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_scope_framework`

Bulk-scope every control from a framework into your organization. Creates scoped-control entries for all controls in the framework.

| Parameter      | Type   | Required | Description                                    |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `org_id`       | string | Yes      | Organization ID (UUID)                         |
| `framework_id` | string | Yes      | Framework ID to scope (e.g., `nist-800-53-r5`) |

---

## `scf_batch_update_controls`

Batch update multiple scoped controls in a single transaction. Maximum 500 operations per request. Status values must be lowercase; maturity uses the `L` prefix format.

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

## Example prompts

- "Show me our organization's control implementation progress."
- "Scope the ISO 27001 framework for my org."
- "Batch update all access-control controls to `in_progress`."
- "Get the implementation status of `AST-01`."
