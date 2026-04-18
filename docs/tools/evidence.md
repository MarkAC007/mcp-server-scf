# Evidence tools

Track evidence artifacts that demonstrate control implementation, run AI-powered assessments of uploaded files, validate against catalog rules, and score portfolio-level coverage with windowed assessments.

Source: [`src/tools/evidence.ts`](../../src/tools/evidence.ts).

The 19 tools in this domain split into five concerns:

1. **CRUD** — `scf_list_evidence`, `scf_create_evidence`, `scf_update_evidence`, `scf_get_evidence_maturity`, `scf_list_evidence_tasks`
2. **Files** — `scf_list_evidence_files`, `scf_get_evidence_file`
3. **Validation** — `scf_get_evidence_validation`, `scf_revalidate_evidence_file`, `scf_get_evidence_validation_summary`
4. **Per-file AI assessment** — `scf_trigger_evidence_assessment`, `scf_get_evidence_assessment`, `scf_bulk_assess_evidence`, `scf_get_evidence_assessment_summary`
5. **Windowed AI assessment** — `scf_trigger_window_assessment`, `scf_list_window_assessments`, `scf_get_window_assessment`, `scf_bulk_assess_windows`, `scf_get_window_assessment_summary`

---

## `scf_list_evidence`

List evidence items tracked against an organization's controls. Returns each item's tracking status, maturity level, and linked controls. Optionally filter by system.

| Parameter   | Type   | Required | Description                                                |
| ----------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |
| `system_id` | string | No       | Filter by system ID                                        |

---

## `scf_create_evidence`

Create an evidence tracking record from a catalog evidence ID (write — editor+ role). Starts tracking an evidence item for the organization.

| Parameter              | Type    | Required | Description                                                                   |
| ---------------------- | ------- | -------- | ----------------------------------------------------------------------------- |
| `org_id`               | string  | Yes      | Organization ID (UUID)                                                        |
| `evidence_id`          | string  | Yes      | Catalog evidence ID (e.g., `E-IAM-01`) — get from `scf_list_evidence_catalog` |
| `is_tracked`           | boolean | No       | Whether this evidence item is actively tracked (default `false`)              |
| `system_id`            | string  | No       | System ID (UUID) to link this evidence to — get from `scf_list_systems`       |
| `method_of_collection` | string  | No       | How evidence is collected (`automated`, `manual`, `hybrid`)                   |
| `collecting_system`    | string  | No       | System or tool used to collect the evidence                                   |
| `owner`                | string  | No       | Person responsible for this evidence item                                     |
| `frequency`            | string  | No       | `daily`, `weekly`, `monthly`, `quarterly`, `annually`                         |
| `comments`             | string  | No       | Additional notes or context                                                   |

---

## `scf_update_evidence`

Upsert an evidence item's tracking fields (write — editor+ role). Creates the tracking row if missing. All body fields are optional; only provided fields are applied.

| Parameter              | Type    | Required | Description                                           |
| ---------------------- | ------- | -------- | ----------------------------------------------------- |
| `org_id`               | string  | Yes      | Organization ID (UUID)                                |
| `evidence_id`          | string  | Yes      | Catalog evidence ID (e.g., `E-IAM-01`)                |
| `is_tracked`           | boolean | No       | Whether this evidence item is actively tracked        |
| `system_id`            | string  | No       | System ID (UUID) to link this evidence to             |
| `method_of_collection` | string  | No       | `automated`, `manual`, `hybrid`                       |
| `collecting_system`    | string  | No       | System or tool used to collect the evidence           |
| `owner`                | string  | No       | Person responsible for this evidence item             |
| `frequency`            | string  | No       | `daily`, `weekly`, `monthly`, `quarterly`, `annually` |
| `comments`             | string  | No       | Additional notes or context                           |

---

## `scf_get_evidence_maturity`

Get the organization's evidence maturity summary: average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_evidence_tasks`

List evidence collection tasks — the work queue showing what needs to be collected, by whom, and by when. Optionally filter by assignee or status.

| Parameter  | Type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| `org_id`   | string | No       | Organization ID (UUID)  |
| `assignee` | string | No       | Filter by assigned user |
| `status`   | string | No       | Filter by task status   |

---

## `scf_list_evidence_files`

List all files uploaded or ingested for an evidence item. Returns filename, content type, upload timestamp, validation status, and a pre-signed download URL (15-min expiry).

| Parameter     | Type   | Required | Description                       |
| ------------- | ------ | -------- | --------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)            |
| `evidence_id` | string | Yes      | Evidence ID (e.g., `ERL-IAM-001`) |

---

## `scf_get_evidence_file`

Get metadata and a pre-signed download URL (15-min expiry) for a single evidence file. Use to inspect or retrieve a specific uploaded artifact.

| Parameter     | Type   | Required | Description                                                  |
| ------------- | ------ | -------- | ------------------------------------------------------------ |
| `org_id`      | string | Yes      | Organization ID (UUID)                                       |
| `evidence_id` | string | Yes      | Evidence ID                                                  |
| `file_id`     | string | Yes      | Evidence file ID (UUID) — get from `scf_list_evidence_files` |

---

## `scf_get_evidence_validation`

Get the validation result for a single evidence file: status (valid/warning/partial/invalid), completeness score, individual rule findings, source, and timestamp.

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)  |
| `evidence_id` | string | Yes      | Evidence ID             |
| `file_id`     | string | Yes      | Evidence file ID (UUID) |

---

## `scf_revalidate_evidence_file`

Re-run the validation engine against an evidence file (write — editor+ role). Checks catalog existence, content type, field coverage, freshness, storage. Returns the updated result.

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)  |
| `evidence_id` | string | Yes      | Evidence ID             |
| `file_id`     | string | Yes      | Evidence file ID (UUID) |

---

## `scf_get_evidence_validation_summary`

Get aggregate evidence validation metrics for the organization dashboard: total files validated, counts by status (valid/warning/partial/invalid), and overall pass rate.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_trigger_evidence_assessment`

Queue an AI assessment of a single evidence file (write — editor+ role, async). Returns a pending record; poll scf_get_evidence_assessment until status is sufficient/partial/insufficient.

| Parameter           | Type   | Required | Description                           |
| ------------------- | ------ | -------- | ------------------------------------- |
| `org_id`            | string | Yes      | Organization ID (UUID)                |
| `evidence_id`       | string | Yes      | Evidence ID                           |
| `file_id`           | string | Yes      | Evidence file ID (UUID)               |
| `assessment_source` | string | No       | `on_demand` (default), `auto`, `bulk` |

---

## `scf_get_evidence_assessment`

Get the AI assessment for an evidence file: status, relevance score (0–100), structured findings, summary, and audit metadata (model, tokens, cost). Poll after scf_trigger_evidence_assessment.

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)  |
| `evidence_id` | string | Yes      | Evidence ID             |
| `file_id`     | string | Yes      | Evidence file ID (UUID) |

---

## `scf_bulk_assess_evidence`

Queue AI assessments for multiple evidence files (write — editor+ role, async, max 50). Provide evidence_id, file_ids, and/or assess_unassessed. Returns count queued.

| Parameter           | Type    | Required | Description                                     |
| ------------------- | ------- | -------- | ----------------------------------------------- |
| `org_id`            | string  | Yes      | Organization ID (UUID)                          |
| `evidence_id`       | string  | No       | Assess all files for this evidence item         |
| `file_ids`          | array   | No       | Specific evidence file IDs (UUIDs) to assess    |
| `assess_unassessed` | boolean | No       | Assess all files without an existing assessment |

---

## `scf_get_evidence_assessment_summary`

Get aggregate AI assessment metrics for the organization dashboard: total assessed, counts by status, unassessed count, average relevance score, and total cost in cents.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_trigger_window_assessment`

Queue a windowed AI assessment that scores every file in the evidence item's frequency window as one portfolio (write — editor+ role, async). Returns 422 if tracking or frequency is missing.

| Parameter           | Type   | Required | Description                                           |
| ------------------- | ------ | -------- | ----------------------------------------------------- |
| `org_id`            | string | Yes      | Organization ID (UUID)                                |
| `evidence_id`       | string | Yes      | Evidence ID — must have tracking with a frequency set |
| `assessment_source` | string | No       | `on_demand` (default), `auto`, `bulk`                 |

---

## `scf_list_window_assessments`

List recent windowed AI assessments for an evidence item (newest first). Each entry includes window bounds, frequency, file IDs, coverage, status, relevance score, findings, and cost.

| Parameter     | Type   | Required | Description                   |
| ------------- | ------ | -------- | ----------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)        |
| `evidence_id` | string | Yes      | Evidence ID                   |
| `limit`       | number | No       | 1–100, default 10             |
| `offset`      | number | No       | Pagination offset (default 0) |

---

## `scf_get_window_assessment`

Get one windowed AI assessment by ID. Returns full detail: window bounds, frequency, file IDs, coverage, expected artifact types, status, relevance score, findings, summary, hashes, tokens, cost.

| Parameter       | Type   | Required | Description                                                            |
| --------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                                 |
| `assessment_id` | string | Yes      | Windowed assessment ID (UUID) — get from `scf_list_window_assessments` |

---

## `scf_bulk_assess_windows`

Queue windowed AI assessments for up to 25 evidence IDs (write — editor+ role, async). Items without tracking or a frequency set are reported under `skipped_detail` in the response.

| Parameter      | Type   | Required | Description                                         |
| -------------- | ------ | -------- | --------------------------------------------------- |
| `org_id`       | string | Yes      | Organization ID (UUID)                              |
| `evidence_ids` | array  | Yes      | 1–25 evidence IDs (e.g., `['E-IAM-01','E-BCM-11']`) |

---

## `scf_get_window_assessment_summary`

Get aggregate windowed-assessment metrics for the organization dashboard: total windows assessed, counts by status (including `insufficient_sample`), average relevance score, and total cost in cents.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## Example prompts

- "What evidence do I need to collect for SOC 2 audit?"
- "Run AI assessment on the latest file uploaded to `E-IAM-01`."
- "Give me this month's evidence validation pass rate."
- "Trigger windowed assessments for all my `daily`-frequency evidence items."
- "Show evidence maturity by control domain."
