# Catalog tools

Read-only access to the full SCF reference catalog — 1,451 controls, 354+ compliance frameworks, 272 evidence types, and 5,736 assessment objectives. These tools are keyless at the org level: they return the universal SCF taxonomy, not per-organization state.

Source: [`src/tools/catalog.ts`](../../src/tools/catalog.ts).

<!-- consolidated-surface -->

> **Tool surface (v4).** The operations below are exposed as the following tools; pass the operation as `method`. Groups not in the core set appear after `scf_load_tools`. Full mapping: [`migration-consolidation.md`](../migration-consolidation.md).
>
> - `scf_catalog_read` (core): `list_controls` = `scf_list_controls`, `get_control` = `scf_get_control`, `list_domains` = `scf_list_domains`, `get_domain` = `scf_get_domain`, `list_frameworks` = `scf_list_frameworks`, `list_assessment_objectives` = `scf_list_assessment_objectives`, `list_evidence` = `scf_list_evidence_catalog`, `get_evidence` = `scf_get_catalog_evidence`

---

## `scf_list_controls`

List SCF security controls from the reference catalog. Returns paginated controls with SCF ID, title, description, and mapped frameworks. Filter by domain, framework, or free-text search.

| Parameter   | Type   | Required | Description                                                        |
| ----------- | ------ | -------- | ------------------------------------------------------------------ |
| `search`    | string | No       | Search term to filter controls by title or description             |
| `domain`    | string | No       | Filter by compliance domain identifier (e.g., `GOV`, `AST`, `IAC`) |
| `framework` | string | No       | Filter by framework (e.g., `nist-800-53`, `iso-27001`)             |
| `limit`     | number | No       | Number of results to return (1–100, default 25)                    |
| `offset`    | number | No       | Number of results to skip for pagination (default 0)               |

---

## `scf_get_control`

Get a single SCF control by ID. Returns description, mapped frameworks, assessment objectives, and linked evidence items from the reference catalog.

| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| `scf_id`  | string | Yes      | The SCF control identifier (e.g., `AST-01`, `IAC-15`) |

---

## `scf_list_frameworks`

List every compliance framework mapped in the SCF catalog (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR, and 350+ more). Returns framework identifiers and display names.

_No parameters._

---

## `scf_list_domains`

List every compliance domain in the SCF taxonomy. Domains group related controls (e.g., GOV = Governance, AST = Asset Management, IAC = Identity & Access Control).

_No parameters._

---

## `scf_list_evidence_catalog`

List the SCF reference catalog's 272 evidence types (read, no org). Each entry's `control_mappings` is the catalogue-wide SCF mapping and says nothing about an organization's scope — for the in-scope controls that require an item, call `scf_get_evidence_requiring_controls`. Free-text search and pagination.

| Parameter | Type   | Required | Description                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| `search`  | string | No       | Search term to filter evidence items by title or description |
| `limit`   | number | No       | Number of results to return (1–100, default 25)              |
| `offset`  | number | No       | Number of results to skip for pagination (default 0)         |

---

## `scf_list_assessment_objectives`

List SCF assessment objectives — the 5,736 test criteria used to evaluate control implementation. Optionally filter by control ID; supports free-text search and pagination.

| Parameter    | Type   | Required | Description                                          |
| ------------ | ------ | -------- | ---------------------------------------------------- |
| `control_id` | string | No       | Filter by SCF control ID (e.g., `GOV-01`, `AST-02`)  |
| `search`     | string | No       | Search term to filter assessment objectives          |
| `limit`      | number | No       | Number of results to return (1–100, default 25)      |
| `offset`     | number | No       | Number of results to skip for pagination (default 0) |

---

## `scf_get_domain`

Get one SCF domain with its controls (read, no org). Deprecated controls are excluded unless include_deprecated is set; a deprecated domain still resolves, badged.

| Parameter            | Type    | Required | Description                                                     |
| -------------------- | ------- | -------- | --------------------------------------------------------------- |
| `identifier`         | string  | Yes      | Domain code or slug (e.g., `IAC`) — get from `scf_list_domains` |
| `include_deprecated` | boolean | No       | Include deprecated controls (default `false`)                   |

---

## `scf_get_catalog_evidence`

Get one catalog evidence entry (read, no org): title, description, area of focus and `control_mappings` — the catalogue-wide SCF mapping, not scope. For the organization's in-scope controls that require it use `scf_get_evidence_requiring_controls`; for its tracking record use `scf_get_evidence`.

| Parameter     | Type   | Required | Description                                                |
| ------------- | ------ | -------- | ---------------------------------------------------------- |
| `evidence_id` | string | Yes      | Catalog evidence ID — get from `scf_list_evidence_catalog` |

---

## Example prompts

- "What NIST 800-53 controls apply to access control?"
- "Show me the assessment objectives for `GOV-01`."
- "List all frameworks mapped in SCF."
- "Find every control in the `IAC` domain."
