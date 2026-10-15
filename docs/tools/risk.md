# Risk Management tools

5x5 risk matrix with inherent and residual scoring, treatment tracking, severity summaries, and org-defined custom risks with control mappings. Custom risks auto-generate `R-ORG-N` codes alongside the static SCF risk catalog.

Source: [`src/tools/risk.ts`](../../src/tools/risk.ts).

The 19 tools split into five concerns:

1. **Risk register** — `scf_list_risks`, `scf_get_risk`, `scf_create_risk`, `scf_update_risk_assessment`, `scf_delete_risk_assessment`, `scf_get_risk_matrix`, `scf_get_risk_summary`, `scf_get_risk_profile`
2. **Risk acceptance** — `scf_accept_risk`
3. **Custom risk definitions** — `scf_list_custom_risks`, `scf_create_custom_risk`, `scf_update_custom_risk`, `scf_delete_custom_risk`
4. **Custom risk control mappings and standards exceptions** — `scf_list_custom_risk_controls`, `scf_add_custom_risk_control`, `scf_update_custom_risk_control`, `scf_remove_custom_risk_control`
5. **Risk ↔ control traceability** — `scf_get_risks_for_control`, `scf_get_controls_for_risk`

An accepted risk records who approved it, when, why and until when. Only `scf_accept_risk` (admin) records that approval: setting `treatment_status` to `accepted` through `scf_update_risk_assessment` records none, re-scoring an accepted risk clears it, and changing a standards exception's control links clears it. `acceptance_state` reads `approved`, `expired` or `unapproved`. A custom risk linked to a control and a document is a standards exception against that document.

---

## `scf_list_risks`

List the whole risk register (ordered by risk code): scores, treatment status and any acceptance (accepted_by, accepted_at, rationale, expiry, acceptance_state). Filter by status, level, category.

| Parameter          | Type   | Required | Description                                                                                                                                                |
| ------------------ | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`           | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                     |
| `status`           | string | No       | Filter by treatment status: identified, analysed, treating, treated, accepted or monitoring (sent as the platform's treatment_status)                      |
| `acceptance_state` | string | No       | Accepted risks only, by their approval: 'approved' (in force), 'expired' (past acceptance_expires_on) or 'unapproved' (accepted with no approval recorded) |
| `risk_level`       | string | No       | Filter by inherent risk level, banded by the org's risk profile                                                                                            |
| `category`         | string | No       | Filter by catalog risk category code, e.g. 'AC' matches R-AC-N                                                                                             |

---

## `scf_get_risk`

Get one risk assessment: inherent and residual scores, treatment plan, owner, review date, and any acceptance (accepted_by, accepted_at, rationale, expires_on, acceptance_state).

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `risk_id` | string | Yes      | Risk assessment ID — obtain from scf_list_risks        |

---

## `scf_create_risk`

Create a new risk assessment in the risk register (write — editor+ role). Likelihood and impact scores populate the 5×5 risk matrix.

| Parameter          | Type    | Required | Description                                            |
| ------------------ | ------- | -------- | ------------------------------------------------------ |
| `org_id`           | string  | Yes      | Organization UUID — obtain from scf_list_organizations |
| `title`            | string  | Yes      | Risk title (required, max ~100 chars)                  |
| `description`      | string  | Yes      | Risk description (required)                            |
| `likelihood`       | integer | Yes      | Inherent likelihood on a 1–5 scale                     |
| `impact`           | integer | Yes      | Inherent impact on a 1–5 scale                         |
| `owner`            | string  | No       | Name or identifier of the risk owner                   |
| `treatment_status` | string  | No       | Treatment workflow status (default identified)         |
| `control_id`       | string  | No       | Linked control ID                                      |

---

## `scf_get_risk_matrix`

Get the 5×5 risk matrix data for the organization — risk distribution across likelihood × impact, ready for visualization.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_get_risk_summary`

Get the organization's aggregate risk summary: totals by severity, treatment status breakdown, and trend data.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_custom_risks`

List the organization's custom risk definitions — org-defined risks alongside the static SCF catalog, carrying auto-generated R-ORG-N codes.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_create_custom_risk`

Create a custom org-defined risk (write — editor+ role). Auto-generates an R-ORG-N code and creates the matching risk assessment record.

| Parameter        | Type   | Required | Description                                       |
| ---------------- | ------ | -------- | ------------------------------------------------- |
| `org_id`         | string | Yes      | Organization ID (UUID)                            |
| `title`          | string | Yes      | Risk title (max 100 chars)                        |
| `description`    | string | Yes      | Risk description                                  |
| `category_name`  | string | No       | Category label (default `Custom`)                 |
| `category_color` | string | No       | Hex colour for category badge (default `#6b7280`) |

---

## `scf_update_custom_risk`

Update a custom risk definition's metadata — title, description, category (write — editor+ role). Only provided fields are applied.

| Parameter        | Type   | Required | Description                        |
| ---------------- | ------ | -------- | ---------------------------------- |
| `org_id`         | string | Yes      | Organization ID (UUID)             |
| `risk_code`      | string | Yes      | Custom risk code (e.g., `R-ORG-1`) |
| `title`          | string | No       | Updated risk title                 |
| `description`    | string | No       | Updated risk description           |
| `category_name`  | string | No       | Updated category label             |
| `category_color` | string | No       | Updated hex colour                 |

---

## `scf_delete_custom_risk`

Delete a custom risk definition, its assessment record, and every control mapping (destructive write — editor+ role). Irreversible.

| Parameter   | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)             |
| `risk_code` | string | Yes      | Custom risk code (e.g., `R-ORG-1`) |

---

## `scf_list_custom_risk_controls`

List controls linked to a custom risk: catalog_control_ids, links (scf_id + document_id of the standard it is an exception against) and scoped_controls with implementation status.

| Parameter   | Type   | Required | Description                                                                              |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization UUID — obtain from scf_list_organizations                                   |
| `risk_code` | string | Yes      | Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks |

---

## `scf_add_custom_risk_control`

Link a control to a custom risk (write — editor+), optionally with the document whose standard it is an exception against. Changing an accepted exception's links clears its approval.

| Parameter     | Type   | Required | Description                                                                                                                                                                                                 |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                      |
| `risk_code`   | string | Yes      | Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks                                                                                                                    |
| `scf_id`      | string | Yes      | SCF control ID to link (e.g., `AST-01`)                                                                                                                                                                     |
| `document_id` | string | No       | Organisation document that sets the standard this risk is an exception against — obtain from scf_list_documents (404 if not this org's). A link with a document makes the custom risk a standards exception |

---

## `scf_remove_custom_risk_control`

Unlink a control from a custom risk (write — editor+ role). The control and risk both remain; only the mapping is removed. Unlinking clears an accepted exception's approval.

| Parameter   | Type   | Required | Description                                                                              |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization UUID — obtain from scf_list_organizations                                   |
| `risk_code` | string | Yes      | Custom risk code in R-ORG-N format (e.g., 'R-ORG-1') — obtain from scf_list_custom_risks |
| `scf_id`    | string | Yes      | SCF control ID to unlink (e.g., `AST-01`)                                                |

---

## `scf_update_risk_assessment`

Update a scored risk by code (write — editor). Only passed fields change. Setting accepted records no approval (use scf_accept_risk); re-scoring an accepted risk clears its approval.

| Parameter             | Type    | Required | Description                                                                                                                                                                                                                                  |
| --------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`              | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                                       |
| `risk_code`           | string  | Yes      | Risk code — catalog R-XX-N or custom R-ORG-N                                                                                                                                                                                                 |
| `likelihood`          | integer | No       | Inherent likelihood on a 1–5 scale                                                                                                                                                                                                           |
| `impact`              | integer | No       | Inherent impact on a 1–5 scale                                                                                                                                                                                                               |
| `residual_likelihood` | integer | No       | Residual likelihood after treatment, 1–5 scale                                                                                                                                                                                               |
| `residual_impact`     | integer | No       | Residual impact after treatment, 1–5 scale                                                                                                                                                                                                   |
| `treatment_status`    | string  | No       | Treatment lifecycle state. 'accepted' set here records no approval — scf_accept_risk does. Below admin, moving an accepted risk with an approval in force off accepted is ignored (it stays accepted); an admin's move clears the acceptance |
| `treatment_plan`      | string  | No       | How the risk is being treated                                                                                                                                                                                                                |
| `treatment_due_date`  | string  | No       | YYYY-MM-DD                                                                                                                                                                                                                                   |
| `next_review_date`    | string  | No       | YYYY-MM-DD                                                                                                                                                                                                                                   |
| `owner_user_id`       | string  | No       | Risk owner — obtain from scf_list_members                                                                                                                                                                                                    |
| `notes`               | string  | No       | Free-text notes on this risk assessment                                                                                                                                                                                                      |

---

## `scf_delete_risk_assessment`

Delete an organization's scoring of a risk code (destructive write — editor role). The catalog or custom risk definition itself remains; only this org's assessment row is removed.

| Parameter   | Type   | Required | Description                                      |
| ----------- | ------ | -------- | ------------------------------------------------ |
| `org_id`    | string | Yes      | Organization ID (UUID)                           |
| `risk_code` | string | Yes      | Risk code — catalog `R-XX-N` or custom `R-ORG-N` |

---

## `scf_get_risks_for_control`

List the risk codes a control addresses and this organization's assessments of them (read — viewer role). Control-to-risk traceability from the SCF catalog mapping.

| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID)                                |
| `scf_id`  | string | Yes      | SCF control ID in `DOMAIN-NN` format (e.g., `IAC-01`) |

---

## `scf_get_controls_for_risk`

List the controls that address a risk code (read — viewer role). Works for catalog risks (`R-XX-N` via the SCF mapping) and custom risks (`R-ORG-N` via the org's control mappings).

| Parameter   | Type   | Required | Description                                      |
| ----------- | ------ | -------- | ------------------------------------------------ |
| `org_id`    | string | Yes      | Organization ID (UUID)                           |
| `risk_code` | string | Yes      | Risk code — catalog `R-XX-N` or custom `R-ORG-N` |

---

## `scf_get_risk_profile`

Get the organization's risk profile (read — viewer role): the severity thresholds that band the 5×5 matrix into low, medium, high and critical. Auto-created with defaults if unset.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_accept_risk`

Accept a risk (write — admin): records you as approver, now, the rationale and expiry. Renews an accepted risk. Also accepts a standards exception. A platform key without a user gets 403.

| Parameter    | Type   | Required | Description                                                                                        |
| ------------ | ------ | -------- | -------------------------------------------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization UUID — obtain from scf_list_organizations                                             |
| `risk_code`  | string | Yes      | Risk code — catalog R-XX-N or custom R-ORG-N — obtain from scf_list_risks or scf_list_custom_risks |
| `rationale`  | string | Yes      | Why the risk is accepted (required, non-blank; stored trimmed). Blank is refused                   |
| `expires_on` | string | Yes      | Date the acceptance lapses (YYYY-MM-DD); must be after today (400 otherwise)                       |

---

## `scf_update_custom_risk_control`

Set or clear the standard's document on a custom risk's control link (write — editor). A changed document clears an accepted exception's approval.

| Parameter     | Type           | Required | Description                                                                                                                                                              |
| ------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `org_id`      | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                   |
| `risk_code`   | string         | Yes      | Custom risk code in R-ORG-N format — obtain from scf_list_custom_risks                                                                                                   |
| `scf_id`      | string         | Yes      | SCF control ID of an existing link — obtain from scf_list_custom_risk_controls                                                                                           |
| `document_id` | string \| null | Yes      | Organisation document whose standard this risk is an exception against (404 if not this org's), or null to clear. Required: the platform refuses a call without it (422) |

---

## Example prompts

- "Show the 5x5 risk matrix for my organization."
- "Create a risk assessment for our cloud migration."
- "List all critical risks needing treatment."
- "Define a custom risk for supplier concentration and link `GOV-12`."
