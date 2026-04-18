# Capabilities & Systems tools

KSI-aligned capability themes (11 NIST 800-53-derived security capability areas) with multi-axis scorecards, evidence posture, and system inventory for mapping capabilities to the tools that implement them.

Source: [`src/tools/capabilities.ts`](../../src/tools/capabilities.ts).

---

## `scf_list_capability_themes`

List the 11 KSI-aligned capability themes for an organization. Capability themes group NIST 800-53 controls into security capability areas, providing a high-level view of security posture.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_get_capability_theme_scorecard`

Multi-axis KSI scorecard for all capability themes in one call. Returns per-theme Implementation Coverage, Maturity, Evidence Coverage, Evidence Quality, and composite KSI Posture Score (KPS) with `Strong`/`Moderate`/`Developing` bands. Replaces the dual-call pattern of `scf_list_capability_themes` + `scf_get_capability_theme_evidence_posture`.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_get_capability_theme`

Get a single capability theme (KSI) with full posture, multi-axis scores, bands, and legacy `posture_percentage`.

| Parameter    | Type   | Required | Description                                                                            |
| ------------ | ------ | -------- | -------------------------------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization ID (UUID)                                                                 |
| `theme_code` | string | Yes      | Capability theme code (e.g., `ACCESS_CONTROL`) — get from `scf_list_capability_themes` |

---

## `scf_list_capability_theme_controls`

List SCF controls mapped to a capability theme (KSI) with scoping status, implementation status, and maturity level. Useful for drilling from a KSI into its underlying controls.

| Parameter      | Type   | Required | Description                                    |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `org_id`       | string | Yes      | Organization ID (UUID)                         |
| `theme_code`   | string | Yes      | Capability theme code (e.g., `ACCESS_CONTROL`) |
| `scope_status` | string | No       | `in_scope` (default), `out_of_scope`, `all`    |
| `limit`        | number | No       | Max results per page (1–200, default 50)       |
| `offset`       | number | No       | Pagination offset (default 0)                  |

---

## `scf_get_capability_theme_evidence_posture`

Per-theme evidence assessment metrics — controls with evidence, file counts by assessment status (`sufficient`/`partial`/`insufficient`/`pending`/`unassessed`), average relevance score, and derived evidence confidence level (`strong`/`moderate`/`weak`/`none`). Useful for KSI-centric evidence quality dashboards.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_capabilities`

List capabilities for an organization. Capabilities map to systems and evidence, showing what security functions your infrastructure supports.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_systems`

List infrastructure systems in the organization's inventory. Systems are the tools and platforms that implement security capabilities.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_create_system`

Add a system to the organization's infrastructure inventory. Systems can be linked to capabilities and evidence.

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

Update an existing system record. All fields are optional — only provided fields are updated.

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
