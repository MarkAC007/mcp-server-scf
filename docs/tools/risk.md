# Risk Management tools

5x5 risk matrix with inherent and residual scoring, treatment tracking, severity summaries, and org-defined custom risks with control mappings. Custom risks auto-generate `R-ORG-N` codes alongside the static SCF risk catalog.

Source: [`src/tools/risk.ts`](../../src/tools/risk.ts).

The 12 tools split into three concerns:

1. **Risk register** — `list_risks`, `get_risk`, `create_risk`, `get_risk_matrix`, `get_risk_summary`
2. **Custom risk definitions** — `list_custom_risks`, `create_custom_risk`, `update_custom_risk`, `delete_custom_risk`
3. **Custom risk control mappings** — `list_custom_risk_controls`, `add_custom_risk_control`, `remove_custom_risk_control`

---

## `list_risks`

List risk assessments in the organization's risk register. Returns risks with likelihood, impact, treatment status, and linked controls.

| Parameter  | Type   | Required | Description                                            |
| ---------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`   | string | Yes      | Organization ID (UUID) — get from `list_organizations` |
| `status`   | string | No       | Filter by treatment status                             |
| `page`     | number | No       | Page number (default 1)                                |
| `per_page` | number | No       | Results per page (1–100, default 25)                   |

---

## `get_risk`

Get detailed risk assessment including likelihood/impact scores (inherent and residual), treatment plan, owner, and review date.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |
| `risk_id` | string | Yes      | Risk assessment ID     |

---

## `create_risk`

Create a new risk assessment in the risk register. Requires likelihood and impact scores for the 5x5 matrix.

| Parameter          | Type   | Required | Description                               |
| ------------------ | ------ | -------- | ----------------------------------------- |
| `org_id`           | string | Yes      | Organization ID (UUID)                    |
| `title`            | string | Yes      | Risk title                                |
| `description`      | string | Yes      | Risk description                          |
| `likelihood`       | number | Yes      | Inherent likelihood (1–5)                 |
| `impact`           | number | Yes      | Inherent impact (1–5)                     |
| `owner`            | string | No       | Risk owner                                |
| `treatment_status` | string | No       | `mitigate`, `accept`, `transfer`, `avoid` |
| `control_id`       | string | No       | Linked control ID                         |

---

## `get_risk_matrix`

Get the 5x5 risk matrix visualization data. Shows risk distribution across likelihood and impact dimensions.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `get_risk_summary`

Aggregated risk summary — total risks by severity, treatment status breakdown, and trend data.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `list_custom_risks`

List custom (organization-defined) risk definitions. These are risks created by the org alongside the static SCF risk catalog, with auto-generated `R-ORG-N` codes.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `create_custom_risk`

Create a custom organization-defined risk. Auto-generates an `R-ORG-N` code and creates the corresponding risk assessment record.

| Parameter        | Type   | Required | Description                                       |
| ---------------- | ------ | -------- | ------------------------------------------------- |
| `org_id`         | string | Yes      | Organization ID (UUID)                            |
| `title`          | string | Yes      | Risk title (max 100 chars)                        |
| `description`    | string | Yes      | Risk description                                  |
| `category_name`  | string | No       | Category label (default `Custom`)                 |
| `category_color` | string | No       | Hex colour for category badge (default `#6b7280`) |

---

## `update_custom_risk`

Update a custom risk definition's metadata (title, description, category).

| Parameter        | Type   | Required | Description                        |
| ---------------- | ------ | -------- | ---------------------------------- |
| `org_id`         | string | Yes      | Organization ID (UUID)             |
| `risk_code`      | string | Yes      | Custom risk code (e.g., `R-ORG-1`) |
| `title`          | string | No       | Updated risk title                 |
| `description`    | string | No       | Updated risk description           |
| `category_name`  | string | No       | Updated category label             |
| `category_color` | string | No       | Updated hex colour                 |

---

## `delete_custom_risk`

Delete a custom risk definition and its assessment record. Also removes any control mappings.

| Parameter   | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)             |
| `risk_code` | string | Yes      | Custom risk code (e.g., `R-ORG-1`) |

---

## `list_custom_risk_controls`

List controls manually linked to a custom risk. Returns the same shape as controls-for-risk (`catalog_control_ids` + `scoped_controls` with implementation status).

| Parameter   | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)             |
| `risk_code` | string | Yes      | Custom risk code (e.g., `R-ORG-1`) |

---

## `add_custom_risk_control`

Link a scoped control to a custom risk. The control must be scoped (selected) for this organization.

| Parameter   | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                  |
| `risk_code` | string | Yes      | Custom risk code (e.g., `R-ORG-1`)      |
| `scf_id`    | string | Yes      | SCF control ID to link (e.g., `AST-01`) |

---

## `remove_custom_risk_control`

Remove a control link from a custom risk.

| Parameter   | Type   | Required | Description                               |
| ----------- | ------ | -------- | ----------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                    |
| `risk_code` | string | Yes      | Custom risk code (e.g., `R-ORG-1`)        |
| `scf_id`    | string | Yes      | SCF control ID to unlink (e.g., `AST-01`) |

---

## Example prompts

- "Show the 5x5 risk matrix for my organization."
- "Create a risk assessment for our cloud migration."
- "List all critical risks needing treatment."
- "Define a custom risk for supplier concentration and link `GOV-12`."
