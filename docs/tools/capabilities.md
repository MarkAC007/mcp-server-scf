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

List the organization's infrastructure systems — the tools and platforms that implement security capabilities. Optionally filter by linked vendor.

| Parameter   | Type   | Required | Description                                            |
| ----------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`    | string | Yes      | Organization ID (UUID)                                 |
| `vendor_id` | string | No       | Only systems structurally linked to this vendor (UUID) |

---

## `scf_create_system`

Create a system in the organization's infrastructure inventory (write — editor+ role). Systems can be linked to capabilities, evidence, a vendor, and a catalog template.

| Parameter             | Type   | Required | Description                                                                                                                        |
| --------------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`              | string | Yes      | Organization ID (UUID)                                                                                                             |
| `name`                | string | Yes      | System name                                                                                                                        |
| `system_type`         | string | Yes      | `cloud_provider`, `identity_provider`, `ticketing`, `logging`, `security_tool`, `code_repository`, `document_management`, `custom` |
| `description`         | string | No       | System description                                                                                                                 |
| `status`              | string | No       | `active` (default), `inactive`, `deprecated`                                                                                       |
| `vendor`              | string | No       | Legacy free-text vendor name (prefer `vendor_id`)                                                                                  |
| `vendor_id`           | string | No       | Vendor UUID for a structural link (same org) — get from `scf_list_vendors`                                                         |
| `catalog_template_id` | number | No       | System-catalog template ID — get from `scf_list_system_catalog`                                                                    |
| `category`            | string | No       | System category (e.g., `SIEM`, `Endpoint`, `Identity`)                                                                             |

---

## `scf_update_system`

Update an existing system record (write — editor+ role). All fields are optional; only provided fields are applied.

| Parameter             | Type   | Required | Description                                       |
| --------------------- | ------ | -------- | ------------------------------------------------- |
| `org_id`              | string | Yes      | Organization ID (UUID)                            |
| `system_id`           | string | Yes      | System ID — get from `scf_list_systems`           |
| `name`                | string | No       | System name                                       |
| `description`         | string | No       | System description                                |
| `system_type`         | string | No       | Same enum as `scf_create_system`                  |
| `status`              | string | No       | `active`, `inactive`, `deprecated`                |
| `vendor`              | string | No       | Legacy free-text vendor name (prefer `vendor_id`) |
| `vendor_id`           | string | No       | Vendor UUID for a structural link (same org)      |
| `catalog_template_id` | number | No       | System-catalog template ID                        |
| `category`            | string | No       | System category                                   |

---

## `scf_list_system_catalog`

List system-catalog templates — the platform's knowledge base of known vendors/tools with slug, vendor, type, and available recipe maturity levels. Not org-scoped.

| Parameter | Type   | Required | Description                                         |
| --------- | ------ | -------- | --------------------------------------------------- |
| `search`  | string | No       | Free-text search across names, vendors, and aliases |

---

## `scf_get_system_catalog_template`

Get one system-catalog template by slug with full detail: aliases and curated evidence-collection recipes (maturity level, steps, frequency, estimated time).

| Parameter | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| `slug`    | string | Yes      | Template slug — from `scf_list_system_catalog` |

---

## `scf_get_system_recipes`

Get evidence-collection recipes for a system, matched via its catalog template, alias, or fallback. Returns `matched_via` (`template`/`alias`/`fallback`/`none`), the template summary, and per-maturity-level recipes.

| Parameter   | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                  |
| `system_id` | string | Yes      | System ID — get from `scf_list_systems` |

---

## `scf_generate_system_recipes`

Queue AI generation of evidence-collection recipes for a system (write — editor+ role, async, HTTP 202). Poll `scf_get_recipe_generation_status`.

| Parameter   | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                  |
| `system_id` | string | Yes      | System ID — get from `scf_list_systems` |

---

## `scf_get_recipe_generation_status`

Get the status of a queued AI recipe-generation job for a system.

| Parameter   | Type   | Required | Description                             |
| ----------- | ------ | -------- | --------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                  |
| `system_id` | string | Yes      | System ID — get from `scf_list_systems` |

---

## Example prompts

- "Give me the KSI scorecard for my org."
- "What's our evidence posture on `ACCESS_CONTROL`?"
- "List all systems in our infrastructure inventory."
- "Add Okta as an identity provider and link it to the Okta vendor record."
- "Is GitHub in the system catalog? Show me its evidence recipes."
- "Generate evidence-collection recipes for our SIEM system."
