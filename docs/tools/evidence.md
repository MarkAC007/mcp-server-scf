# Evidence tools

Track evidence artifacts that demonstrate control implementation, run AI-powered assessments of uploaded files, validate against catalog rules, and score portfolio-level coverage with windowed assessments.

Source: [`src/tools/evidence.ts`](../../src/tools/evidence.ts).

The 19 tools in this domain split into five concerns:

1. **CRUD** — `list_evidence`, `create_evidence`, `update_evidence`, `get_evidence_maturity`, `list_evidence_tasks`
2. **Files** — `list_evidence_files`, `get_evidence_file`
3. **Validation** — `get_evidence_validation`, `revalidate_evidence_file`, `get_evidence_validation_summary`
4. **Per-file AI assessment** — `trigger_evidence_assessment`, `get_evidence_assessment`, `bulk_assess_evidence`, `get_evidence_assessment_summary`
5. **Windowed AI assessment** — `trigger_window_assessment`, `list_window_assessments`, `get_window_assessment`, `bulk_assess_windows`, `get_window_assessment_summary`

---

## `list_evidence`

List evidence items tracked for an organization's controls. Evidence demonstrates control implementation for audit readiness. Returns evidence with status, maturity, and linked controls.

| Parameter   | Type   | Required | Description                                            |
| ----------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`    | string | Yes      | Organization ID (UUID) — get from `list_organizations` |
| `system_id` | string | No       | Filter by system ID                                    |

---

## `create_evidence`

Create an evidence tracking record from the SCF evidence catalog. Uses a catalog evidence ID (e.g., `E-IAM-01`) to start tracking an evidence item.

| Parameter              | Type    | Required | Description                                                               |
| ---------------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `org_id`               | string  | Yes      | Organization ID (UUID)                                                    |
| `evidence_id`          | string  | Yes      | Catalog evidence ID (e.g., `E-IAM-01`) — get from `list_evidence_catalog` |
| `is_tracked`           | boolean | No       | Whether this evidence item is actively tracked (default `false`)          |
| `system_id`            | string  | No       | System ID (UUID) to link this evidence to — get from `list_systems`       |
| `method_of_collection` | string  | No       | How evidence is collected (`automated`, `manual`, `hybrid`)               |
| `collecting_system`    | string  | No       | System or tool used to collect the evidence                               |
| `owner`                | string  | No       | Person responsible for this evidence item                                 |
| `frequency`            | string  | No       | `daily`, `weekly`, `monthly`, `quarterly`, `annually`                     |
| `comments`             | string  | No       | Additional notes or context                                               |

---

## `update_evidence`

Update an evidence item's tracking fields — toggle tracking, link to a system, set collection method, owner, frequency, etc. Identify by catalog evidence ID. All fields except `org_id`/`evidence_id` are optional. Uses POST-upsert semantics (creates the tracking row if it doesn't exist).

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

## `get_evidence_maturity`

Get evidence maturity summary — average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `list_evidence_tasks`

List evidence collection tasks — the work queue for gathering evidence. Shows what needs to be collected, by whom, and by when.

| Parameter  | Type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| `org_id`   | string | No       | Organization ID (UUID)  |
| `assignee` | string | No       | Filter by assigned user |
| `status`   | string | No       | Filter by task status   |

---

## `list_evidence_files`

List all files uploaded or ingested for a specific evidence item. Returns file metadata including filename, content type, upload timestamp, validation status, and a pre-signed download URL (15-minute expiry).

| Parameter     | Type   | Required | Description                       |
| ------------- | ------ | -------- | --------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)            |
| `evidence_id` | string | Yes      | Evidence ID (e.g., `ERL-IAM-001`) |

---

## `get_evidence_file`

Get metadata and a pre-signed download URL for a single evidence file. Download URL expires after 15 minutes.

| Parameter     | Type   | Required | Description                                              |
| ------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                                   |
| `evidence_id` | string | Yes      | Evidence ID                                              |
| `file_id`     | string | Yes      | Evidence file ID (UUID) — get from `list_evidence_files` |

---

## `get_evidence_validation`

Get the validation result for a specific evidence file. Returns overall status (`valid`/`warning`/`partial`/`invalid`), completeness score, individual rule findings (`catalog_exists`, `content_type_ok`, `field_coverage`, `freshness`, `s3_object_exists`), validation source, and timestamp.

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)  |
| `evidence_id` | string | Yes      | Evidence ID             |
| `file_id`     | string | Yes      | Evidence file ID (UUID) |

---

## `revalidate_evidence_file`

Re-run the validation engine against a specific evidence file. Checks catalog existence, content type, field coverage, freshness, and storage object existence. Upserts the validation result and returns it. **Requires editor role or higher.**

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)  |
| `evidence_id` | string | Yes      | Evidence ID             |
| `file_id`     | string | Yes      | Evidence file ID (UUID) |

---

## `get_evidence_validation_summary`

Get aggregate evidence validation metrics for the organization dashboard. Returns total files validated, counts by status (`valid`, `warning`, `partial`, `invalid`), and overall pass rate.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `trigger_evidence_assessment`

Trigger an AI-powered assessment of an evidence artifact file. Evaluates relevance, completeness, and quality against mapped SCF controls. Returns a pending assessment record — poll `get_evidence_assessment` until status changes. **Requires editor role or higher.**

| Parameter           | Type   | Required | Description                           |
| ------------------- | ------ | -------- | ------------------------------------- |
| `org_id`            | string | Yes      | Organization ID (UUID)                |
| `evidence_id`       | string | Yes      | Evidence ID                           |
| `file_id`           | string | Yes      | Evidence file ID (UUID)               |
| `assessment_source` | string | No       | `on_demand` (default), `auto`, `bulk` |

---

## `get_evidence_assessment`

Get the AI assessment result for an evidence file. Returns status (`pending`/`processing`/`sufficient`/`partial`/`insufficient`/`error`), relevance score (0–100), structured findings, summary text, and full audit metadata (model, token counts, cost).

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)  |
| `evidence_id` | string | Yes      | Evidence ID             |
| `file_id`     | string | Yes      | Evidence file ID (UUID) |

---

## `bulk_assess_evidence`

Queue AI assessments for multiple evidence files at once (max 50 per request). Provide at least one of: `evidence_id`, `file_ids`, or `assess_unassessed`. **Requires editor role or higher.**

| Parameter           | Type    | Required | Description                                     |
| ------------------- | ------- | -------- | ----------------------------------------------- |
| `org_id`            | string  | Yes      | Organization ID (UUID)                          |
| `evidence_id`       | string  | No       | Assess all files for this evidence item         |
| `file_ids`          | array   | No       | Specific evidence file IDs (UUIDs) to assess    |
| `assess_unassessed` | boolean | No       | Assess all files without an existing assessment |

---

## `get_evidence_assessment_summary`

Get aggregate AI assessment metrics — total assessed count, counts by status, unassessed count, average relevance score, and total cost in cents.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `trigger_window_assessment`

Queue a windowed AI assessment for an evidence item. Scores all files uploaded inside the frequency-derived window as a portfolio against the union of required artifact types across mapped SCF controls. Returns 202 — poll with `list_window_assessments` or `get_window_assessment`. **Requires editor role or higher.** Returns 422 if the evidence has no tracking row or no frequency set (set one via `update_evidence`).

| Parameter           | Type   | Required | Description                                           |
| ------------------- | ------ | -------- | ----------------------------------------------------- |
| `org_id`            | string | Yes      | Organization ID (UUID)                                |
| `evidence_id`       | string | Yes      | Evidence ID — must have tracking with a frequency set |
| `assessment_source` | string | No       | `on_demand` (default), `auto`, `bulk`                 |

---

## `list_window_assessments`

List the most recent windowed AI assessments for a specific evidence ID (newest first). Each entry includes window boundaries, frequency used, file IDs in the window, source/artifact coverage, status, relevance score, findings, and cost.

| Parameter     | Type   | Required | Description                   |
| ------------- | ------ | -------- | ----------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)        |
| `evidence_id` | string | Yes      | Evidence ID                   |
| `limit`       | number | No       | 1–100, default 10             |
| `offset`      | number | No       | Pagination offset (default 0) |

---

## `get_window_assessment`

Get a single windowed AI assessment by its assessment ID. Returns full detail: window boundaries, frequency, file IDs, coverage metrics, status, relevance score, findings, summary, hashes, token counts, cost, and timing.

| Parameter       | Type   | Required | Description                                                        |
| --------------- | ------ | -------- | ------------------------------------------------------------------ |
| `org_id`        | string | Yes      | Organization ID (UUID)                                             |
| `assessment_id` | string | Yes      | Windowed assessment ID (UUID) — get from `list_window_assessments` |

---

## `bulk_assess_windows`

Queue windowed AI assessments for multiple evidence IDs in one call (max 25 per request). Evidence items without a tracking row or frequency are skipped and reported under `skipped_detail`. **Requires editor role or higher.**

| Parameter      | Type   | Required | Description                                         |
| -------------- | ------ | -------- | --------------------------------------------------- |
| `org_id`       | string | Yes      | Organization ID (UUID)                              |
| `evidence_ids` | array  | Yes      | 1–25 evidence IDs (e.g., `['E-IAM-01','E-BCM-11']`) |

---

## `get_window_assessment_summary`

Aggregate windowed-assessment metrics — total windows assessed, counts by status (`sufficient`/`partial`/`insufficient`/`insufficient_sample`/`pending`/`error`), average relevance score, and total cost in cents. `insufficient_sample` indicates the content was fine but the window had too few files to cover the controls' required artifact types.

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
