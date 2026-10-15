# Control Scoping tools

Track implementation status of SCF controls scoped to a specific organization. Supports an 8-state implementation workflow (`not_started`, `in_progress`, `implemented`, `ready_for_review`, `monitored`, `not_applicable`, `at_risk`, `deferred`) and a 6-level maturity scale (`L0`–`L5`).

The SCRMS programme fields (scf-controls-platform #1120) live here too: each scoped framework's obligation basis (`mcr` or `dsr`) with a per-control override, per-control target maturity, materiality, and the procedure document a control follows. Excluding a mandatory (MCR) or material control needs an admin and a reason; the platform refuses it otherwise (403 or 409).

Source: [`src/tools/scoped-controls.ts`](../../src/tools/scoped-controls.ts).

---

## `scf_list_scoped_controls`

List controls scoped to the organization with status, basis, target maturity, materiality, procedure and last validation. Filter by scope, domain, framework, team, basis, material. Paginated.

| Parameter                | Type    | Required | Description                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`                 | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                                                                                                                                |
| `scope_status`           | string  | No       | Scope filter: 'in_scope' (selected), 'out_of_scope' (deselected), or 'all' (default — everything)                                                                                                                                                                                                                                     |
| `domain`                 | string  | No       | SCF domain code (e.g., 'GOV', 'AST', 'IAC')                                                                                                                                                                                                                                                                                           |
| `framework`              | string  | No       | Framework slug (e.g., 'nist-800-53') to filter mapped controls                                                                                                                                                                                                                                                                        |
| `csf_function`           | string  | No       | NIST CSF function: 'GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', or 'RECOVER'                                                                                                                                                                                                                                                 |
| `control_weighting`      | integer | No       | Weighting threshold on a 0–10 scale                                                                                                                                                                                                                                                                                                   |
| `search`                 | string  | No       | Free-text filter applied to control ID, name, or description                                                                                                                                                                                                                                                                          |
| `team_id`                | string  | No       | Filter to controls this team is assigned to, accountable or consulted — obtain from scf_list_teams                                                                                                                                                                                                                                    |
| `my_teams`               | boolean | No       | Filter to controls assigned to any team the caller belongs to; intersects with team_id rather than overriding it. 'The caller' is the API key's identity; on a self-hosted instance that is a service account on no team, so this returns nothing — use team_id instead. (default false)                                              |
| `function_id`            | string  | No       | Filter to controls assigned to any team aligned to this function — obtain from scf_list_functions                                                                                                                                                                                                                                     |
| `accountable_owner_type` | string  | No       | Filter by the accountable team's primary owner: 'internal' or 'external_contractor'                                                                                                                                                                                                                                                   |
| `basis`                  | string  | No       | Filter by obligation basis: 'mcr', 'dsr', or 'unclassified' (no classified framework and no override). Each row carries obligation_basis, basis_source (override \| framework) and basis_override_reason                                                                                                                              |
| `material`               | boolean | No       | Filter by materiality: true for material controls (catalogue weighting 10, or an admin override), false for the rest. Rows carry material, material_source (control \| weighting) and material_reason                                                                                                                                 |
| `sort`                   | string  | No       | Order: 'scf_id' (default), or 'weighting' — material controls first, then catalogue weighting highest first, then scf_id. Rows also carry target_maturity, target_source (control \| domain), target_maturity_reason, procedure_document_id, procedure_document_status, last_validated_at, last_validated_by and last_validation_note |
| `limit`                  | integer | No       | Page size (1–200, default 50)                                                                                                                                                                                                                                                                                                         |
| `offset`                 | integer | No       | Pagination offset — number of results to skip (default 0)                                                                                                                                                                                                                                                                             |

---

## `scf_get_scoped_control`

Get one scoped control: owner, notes, scope/basis/target/material overrides with reason, set_at and set_by, procedure_document_id, last validation. Identify by scf_id, not UUID.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `scf_id`  | string | Yes      | SCF control identifier (e.g., `AST-01`) — NOT the UUID |

---

## `scf_update_scoped_control`

Update a scoped control's implementation fields (write — editor+). Identify by scf_id. Only provided fields apply. Material controls: admin for not_applicable. at_risk raises a deficiency.

| Parameter               | Type   | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`                | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                                                                                                                                                                                                                                        |
| `scf_id`                | string | Yes      | SCF control identifier (e.g., `AST-01`) — NOT the UUID                                                                                                                                                                                                                                                                                                                                                                                        |
| `implementation_status` | string | No       | New implementation status (lowercase): not_started, in_progress, implemented, ready_for_review, monitored, not_applicable, at_risk, or deferred. Moving to at_risk raises a deficiency (see scf_list_deficiencies). A material control (catalogue weighting 10, or set material by an admin) can only leave scope through scf_set_scope_override by an admin (other paths 409), and only an admin may mark it not_applicable (403 otherwise). |
| `priority`              | string | No       | Implementation priority: 'high', 'medium', or 'low'                                                                                                                                                                                                                                                                                                                                                                                           |
| `maturity_level`        | string | No       | Maturity level with L prefix: L0 Not Performed, L1 Performed, L2 Planned, L3 Well Defined, L4 Quantitatively Controlled, L5 Continuously Improving                                                                                                                                                                                                                                                                                            |
| `owner`                 | string | No       | Accountable owner of the control                                                                                                                                                                                                                                                                                                                                                                                                              |
| `assigned_to`           | string | No       | Assignee responsible for implementation                                                                                                                                                                                                                                                                                                                                                                                                       |
| `implementation_notes`  | string | No       | Free-text implementation notes and context                                                                                                                                                                                                                                                                                                                                                                                                    |
| `target_date`           | string | No       | Target completion date in ISO-8601 (YYYY-MM-DD)                                                                                                                                                                                                                                                                                                                                                                                               |
| `completion_date`       | string | No       | Actual completion date in ISO-8601 (YYYY-MM-DD)                                                                                                                                                                                                                                                                                                                                                                                               |
| `selection_reason`      | string | No       | Justification for scoping decision — required for not_applicable or deferred                                                                                                                                                                                                                                                                                                                                                                  |

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

Batch-update up to 500 scoped controls in one transaction (write — editor+). Each operation targets an scf_id. Material/MCR controls: no deselect (409); at_risk raises a deficiency.

| Parameter    | Type   | Required | Description                                            |
| ------------ | ------ | -------- | ------------------------------------------------------ |
| `org_id`     | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `operations` | array  | Yes      | Update operations to apply (1–500 per call)            |

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

Setting `selected: false` on a material or mandatory (MCR) control is refused (409), and setting `implementation_status` to `at_risk` raises a deficiency (see [assurance.md](assurance.md)).

---

## `scf_bulk_unscope_framework`

Unscope every control mapped only to these frameworks (destructive write — editor). Shared controls are kept. An MCR framework, or one taking out a material control, needs an admin and a reason.

| Parameter        | Type   | Required | Description                                                                                                                                                                                                                      |
| ---------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`         | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                           |
| `frameworks`     | array  | Yes      | Framework slugs to remove, e.g. ['iso_27017_2015'] — obtain from scf_list_frameworks                                                                                                                                             |
| `removal_reason` | string | No       | Why these controls leave scope — recorded in the audit trail. Required (400 without it), with an admin key (403 otherwise), when a framework carries an MCR obligation or its removal would take a material control out of scope |

---

## `scf_set_framework_basis`

Record why a scoped framework is in scope (write — ADMIN role): basis mcr|dsr, obligation_type and obligation_source. Replaces all three; null clears. Only an active (scoped) framework, else 404.

| Parameter           | Type           | Required | Description                                                                                                                                                                                               |
| ------------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`            | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                    |
| `framework_id`      | string         | Yes      | Framework slug of a framework the org has scoped — obtain from scf_get_framework_scope_summary                                                                                                            |
| `basis`             | string \| null | Yes      | 'mcr' (mandatory compliance requirement) or 'dsr' (discretionary security requirement); null leaves it unclassified. Reclassifying MCR to DSR changes which exclusions need an approver, hence admin-only |
| `obligation_type`   | string \| null | No       | Where the obligation comes from: statutory, regulatory, contractual or discretionary; omitted or null clears it                                                                                           |
| `obligation_source` | string \| null | No       | The law, regulation or contract behind it (max 2000 characters); omitted, null or blank clears it                                                                                                         |

---

## `scf_set_control_basis_override`

Override one control's derived obligation basis (write — ADMIN role): mcr or dsr with a reason, or null to clear and derive it from its frameworks again. 404 if the control has no scope record.

| Parameter | Type           | Required | Description                                                                                                                              |
| --------- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`  | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                   |
| `scf_id`  | string         | Yes      | SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls                                                        |
| `basis`   | string \| null | Yes      | 'mcr' or 'dsr' to override; null clears the override (and its reason) so the basis is derived from the org's classified frameworks again |
| `reason`  | string         | No       | Why the derived basis is wrong for this control (max 2000 characters) — required when basis is set                                       |

---

## `scf_set_target_maturity`

Override one control's target maturity (write — ADMIN role): a level L0–L5 with a reason, or null to inherit its domain's target again (domain targets: scf_update_org_settings).

| Parameter | Type           | Required | Description                                                                                                                   |
| --------- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `org_id`  | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                                        |
| `scf_id`  | string         | Yes      | SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls                                             |
| `level`   | string \| null | Yes      | Target CMM level L0–L5 for this control; null clears the override (and its reason) and the control inherits its domain target |
| `reason`  | string         | No       | Why this control departs from its domain target (max 2000 characters) — required when level is set                            |

---

## `scf_set_control_materiality`

Set whether one control is material (write — ADMIN's own key; a platform key gets 403): true/false with a reason, or null for the catalogue default (material at weighting 10).

| Parameter  | Type            | Required | Description                                                                                                                                                                                                 |
| ---------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`   | string          | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                      |
| `scf_id`   | string          | Yes      | SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls                                                                                                                           |
| `material` | boolean \| null | Yes      | true or false overrides the catalogue default; null clears the override. The admin is recorded as the approver: deciding a control is not material lets it be excluded or marked not_applicable without one |
| `reason`   | string          | No       | Why (max 2000 characters). Required when material is true or false, and when a null clear makes a control weighted below 10 not material (400 otherwise)                                                    |

---

## `scf_set_control_procedure`

Link one control to its signed-off procedure document, or null to unlink (write — editor+). The document must be this org's procedure, approved or published when linked (400 otherwise).

| Parameter     | Type           | Required | Description                                                                                                                                                                                         |
| ------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`      | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                              |
| `scf_id`      | string         | Yes      | SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls                                                                                                                   |
| `document_id` | string \| null | Yes      | Procedure document UUID — obtain from scf_list_documents; null unlinks. A later edit sends the document back to review; the link stays and scf_list_scoped_controls shows procedure_document_status |

---

## Example prompts

- "Show me our organization's control implementation progress."
- "Scope the ISO 27001 framework for my org."
- "Batch update all access-control controls to `in_progress`."
- "Get the implementation status of `AST-01`."

---

## `scf_get_framework_scope_summary`

Get framework coverage and selection state (read — viewer): each framework's coverage, basis, obligation_type and obligation_source, and basis_counts (in-scope controls by mcr/dsr/unclassified).

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_preview_framework_scope_change`

Preview adding or removing frameworks WITHOUT applying it (read — viewer): controls entering or leaving scope, orphaned evidence, and on remove basis_downgrades (controls whose basis weakens).

| Parameter    | Type   | Required | Description                                                                       |
| ------------ | ------ | -------- | --------------------------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization UUID — obtain from scf_list_organizations                            |
| `operation`  | string | Yes      | 'add' to preview scoping these frameworks in, 'remove' to preview taking them out |
| `frameworks` | array  | Yes      | Framework slugs to model — obtain from scf_list_frameworks                        |

Run this before `scf_scope_framework` or `scf_bulk_unscope_framework`.

---

## `scf_set_scope_override`

Force one control in or out of scope (write — editor+). 'include'/'exclude' pin it; 'inherit' clears it. Excluding an MCR or material control needs an admin key and a reason (editors 403).

| Parameter | Type   | Required | Description                                                                                                                                                                                                                 |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                      |
| `scf_id`  | string | Yes      | SCF control identifier in DOMAIN-NN format — obtain from scf_list_scoped_controls                                                                                                                                           |
| `action`  | string | Yes      | 'include' pins the control in scope, 'exclude' pins it out, 'inherit' clears the override AND discards the recorded rationale (it stays in the audit trail)                                                                 |
| `reason`  | string | No       | Why this control is being overridden — recorded in the audit trail (max 2000 characters). Required for 'exclude'. The admin making an MCR or material exclusion is recorded as its approver; there is no approver parameter |

`inherit` is not a no-op: it clears a previously set override and hands the control back to the framework rollup. It also discards the recorded `reason` — the rationale survives only in the audit trail.
