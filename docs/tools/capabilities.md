# Capabilities & Systems tools

KSI-aligned capability themes (11 NIST 800-53-derived security capability areas) with multi-axis scorecards, evidence posture, and system inventory for mapping capabilities to the tools that implement them.

Source: [`src/tools/capabilities.ts`](../../src/tools/capabilities.ts).

---

## `scf_list_capability_themes`

List an organization's 11 KSI capability themes. Themes group NIST 800-53 controls into security capability areas for a high-level posture view.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_get_capability_theme_scorecard`

Get the multi-axis KSI scorecard for every capability theme. Returns per-theme Implementation Coverage, Maturity, Evidence Coverage, Evidence Quality, and composite KSI Posture Score bands.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_get_capability_theme`

Get a single capability theme (KSI) with full posture, multi-axis scores, band, and legacy posture_percentage.

| Parameter    | Type   | Required | Description                                                                            |
| ------------ | ------ | -------- | -------------------------------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization ID (UUID)                                                                 |
| `theme_code` | string | Yes      | Capability theme code (e.g., `ACCESS_CONTROL`) — get from `scf_list_capability_themes` |

---

## `scf_list_capability_theme_controls`

List SCF controls mapped to a capability theme (KSI), with scoping status, implementation status, and maturity level. Supports pagination and scope filtering — ideal for KSI drill-down.

| Parameter      | Type   | Required | Description                                    |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `org_id`       | string | Yes      | Organization ID (UUID)                         |
| `theme_code`   | string | Yes      | Capability theme code (e.g., `ACCESS_CONTROL`) |
| `scope_status` | string | No       | `in_scope` (default), `out_of_scope`, `all`    |
| `limit`        | number | No       | Max results per page (1–200, default 50)       |
| `offset`       | number | No       | Pagination offset (default 0)                  |

---

## `scf_get_capability_theme_evidence_posture`

Get per-theme evidence metrics: controls with evidence, file counts by assessment status, average relevance score, and derived confidence (strong/moderate/weak/none). Use for KSI evidence dashboards.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_capabilities`

List an organization's capabilities. Capabilities map to systems and evidence, showing what security functions the infrastructure supports.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_systems`

List the organization's infrastructure systems — the tools and platforms that implement security capabilities.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_create_system`

Create a system in the organization's infrastructure inventory (write — editor+ role). Systems can be linked to capabilities and evidence.

| Parameter     | Type   | Required | Description                                                                                                                        |
| ------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                                                                                                             |
| `name`        | string | Yes      | System name                                                                                                                        |
| `system_type` | string | Yes      | `cloud_provider`, `identity_provider`, `ticketing`, `logging`, `security_tool`, `code_repository`, `document_management`, `custom` |
| `description` | string | No       | System description                                                                                                                 |
| `status`      | string | No       | `active` (default), `inactive`, `deprecated`                                                                                       |
| `vendor`      | string | No       | Vendor ID — get from `scf_list_vendors`                                                                                            |
| `category`    | string | No       | System category (e.g., `SIEM`, `Endpoint`, `Identity`)                                                                             |

---

## `scf_update_system`

Update an existing system record (write — editor+ role). All fields are optional; only provided fields are applied.

| Parameter     | Type   | Required | Description                             |
| ------------- | ------ | -------- | --------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                  |
| `system_id`   | string | Yes      | System ID — get from `scf_list_systems` |
| `name`        | string | No       | System name                             |
| `description` | string | No       | System description                      |
| `system_type` | string | No       | Same enum as `scf_create_system`        |
| `status`      | string | No       | `active`, `inactive`, `deprecated`      |
| `vendor`      | string | No       | Vendor ID                               |
| `category`    | string | No       | System category                         |

---

## Example prompts

- "Give me the KSI scorecard for my org."
- "What's our evidence posture on `ACCESS_CONTROL`?"
- "List all systems in our infrastructure inventory."
- "Add Okta as an identity provider."
