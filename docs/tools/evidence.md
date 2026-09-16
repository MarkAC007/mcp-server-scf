# Evidence tools

Track evidence artifacts that demonstrate control implementation, run AI-powered assessments of uploaded files, validate against catalog rules, and score portfolio-level coverage with windowed assessments.

Source: [`src/tools/evidence.ts`](../../src/tools/evidence.ts).

The 41 tools in this domain split into eight concerns:

1. **CRUD** — `scf_list_evidence`, `scf_get_evidence`, `scf_create_evidence`, `scf_update_evidence`, `scf_batch_update_evidence`, `scf_get_evidence_maturity`
2. **Tasks** — `scf_list_evidence_tasks`, `scf_create_evidence_task`, `scf_update_evidence_task`, `scf_complete_evidence_task`
3. **Files** — `scf_list_evidence_files`, `scf_get_evidence_file`, `scf_review_evidence_file`, `scf_delete_evidence_file`
4. **Validation** — `scf_get_evidence_validation`, `scf_revalidate_evidence_file`, `scf_get_evidence_validation_summary`
5. **Per-file AI assessment** — `scf_trigger_evidence_assessment`, `scf_get_evidence_assessment`, `scf_bulk_assess_evidence`, `scf_get_evidence_assessment_summary`, `scf_get_assessment_review_queue`, `scf_review_evidence_assessment`
6. **Windowed AI assessment** — `scf_trigger_window_assessment`, `scf_list_window_assessments`, `scf_get_window_assessment`, `scf_bulk_assess_windows`, `scf_get_window_assessment_summary`, `scf_refresh_stale_window_assessments`, `scf_review_window_assessment`, `scf_review_window_assessment_verdict`, `scf_get_window_assessment_versions`
7. **Cadence health & maturity guidance** — `scf_get_upcoming_evidence`, `scf_get_frequency_health`, `scf_get_evidence_item_maturity`, `scf_get_evidence_upgrade_recommendations`, `scf_get_evidence_suggestions`, `scf_list_evidence_gaps`, `scf_get_evidence_health`
8. **Control assessment composites** — `scf_get_control_assessment_composite`, `scf_list_control_assessment_composites`

---

## `scf_get_evidence_item_maturity`

Get one evidence item's collection maturity: current level (1=Ad Hoc to 5=Optimized), contributing factors, upgrade potential, and tracking state.

| Parameter     | Type   | Required | Description                                                   |
| ------------- | ------ | -------- | ------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`    |
| `evidence_id` | string | Yes      | Evidence ID (e.g., `E-RSK-02`) — get from `scf_list_evidence` |

---

## `scf_get_evidence_upgrade_recommendations`

Get upgrade-path recommendations for maturing one evidence item's collection: target level, effort, impact, and step-by-step actions — the same guidance shown in the platform UI.

| Parameter     | Type   | Required | Description                                                   |
| ------------- | ------ | -------- | ------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`    |
| `evidence_id` | string | Yes      | Evidence ID (e.g., `E-RSK-02`) — get from `scf_list_evidence` |

---

## `scf_get_evidence_suggestions`

Get system-aware collection suggestions for one evidence item: which tracked system currently collects it, which in-scope systems are capable of collecting it, and tailored collection guidance.

| Parameter     | Type   | Required | Description                                                   |
| ------------- | ------ | -------- | ------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`    |
| `evidence_id` | string | Yes      | Evidence ID (e.g., `E-RSK-02`) — get from `scf_list_evidence` |

---

## `scf_list_evidence_gaps`

List the organization's evidence coverage gaps: evidence required by in-scope controls that is not yet tracked, with overall coverage percentage.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_get_evidence_health`

Get evidence collection health for the organization: per-item freshness status (green/amber/red) against collection frequency, with a roll-up summary.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

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
| `maturity_level`       | string  | No       | Evidence maturity level `L0`–`L5` (e.g., `L3`)                                |
| `comments`             | string  | No       | Additional notes or context                                                   |

---

## `scf_update_evidence`

Upsert an evidence item's tracking fields (write — editor+ role). Creates the tracking row if missing. All body fields are optional; only provided fields are applied.

| Parameter              | Type    | Required | Description                                                               |
| ---------------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `org_id`               | string  | Yes      | Organization ID (UUID)                                                    |
| `evidence_id`          | string  | Yes      | Catalog evidence ID (e.g., `E-IAM-01`)                                    |
| `is_tracked`           | boolean | No       | Whether this evidence item is actively tracked                            |
| `system_id`            | string  | No       | System ID (UUID) to link this evidence to                                 |
| `method_of_collection` | string  | No       | `automated`, `manual`, `hybrid`                                           |
| `collecting_system`    | string  | No       | System or tool used to collect the evidence                               |
| `owner`                | string  | No       | Person responsible for this evidence item                                 |
| `frequency`            | string  | No       | `daily`, `weekly`, `monthly`, `quarterly`, `annually`                     |
| `maturity_level`       | string  | No       | Evidence maturity level `L0`–`L5`; omitting never clears the stored value |
| `comments`             | string  | No       | Additional notes or context                                               |

---

## `scf_get_evidence_maturity`

Get the organization's evidence maturity summary: average maturity score, automation percentage, distribution by maturity level, and improvement opportunities.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_list_evidence_tasks`

List evidence collection tasks — the work queue showing what needs to be collected, by whom, and by when. Optionally filter by assignee or status.

| Parameter              | Type    | Required | Description                                                      |
| ---------------------- | ------- | -------- | ---------------------------------------------------------------- |
| `org_id`               | string  | No       | Organization ID (UUID)                                           |
| `assignee`             | string  | No       | Filter by assigned user UUID                                     |
| `status`               | string  | No       | Filter by task status: `not_started`, `in_progress`, `completed` |
| `overdue_only`         | boolean | No       | Only tasks past their due date                                   |
| `assigned_to_me`       | boolean | No       | Only tasks assigned to the caller                                |
| `evidence_tracking_id` | string  | No       | Only tasks for one evidence tracking record                      |

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

## `scf_get_evidence`

Get one evidence tracking record (read — viewer role): tracked flag, collection method, owner, assignee, frequency, system, maturity level and its catalog deprecation badge.

| Parameter     | Type   | Required | Description                                                                   |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                    |
| `evidence_id` | string | Yes      | Catalog evidence ID (e.g., `E-IAM-01`) — get from `scf_list_evidence_catalog` |

---

## `scf_batch_update_evidence`

Create or update up to 500 evidence tracking records in one transaction (write — editor role). Each upserts by `evidence_id`; only fields given change. Use instead of 500 `scf_update_evidence` calls.

| Parameter                           | Type    | Required | Description                                           |
| ----------------------------------- | ------- | -------- | ----------------------------------------------------- |
| `org_id`                            | string  | Yes      | Organization ID (UUID)                                |
| `operations`                        | array   | Yes      | Upsert operations, 1–500, each keyed by `evidence_id` |
| `operations[].evidence_id`          | string  | Yes      | Catalog evidence ID (e.g., `E-IAM-01`)                |
| `operations[].is_tracked`           | boolean | No       | Toggle active tracking for this item                  |
| `operations[].method_of_collection` | string  | No       | `automated`, `manual`, or `hybrid`                    |
| `operations[].collecting_system`    | string  | No       | Tool or system that collects the evidence             |
| `operations[].assigned_user_id`     | string  | No       | Collector — becomes assignee on generated tasks       |
| `operations[].owner_user_id`        | string  | No       | Accountable owner — task assignee when assignee unset |
| `operations[].frequency`            | string  | No       | Collection frequency (e.g., `monthly`, `quarterly`)   |
| `operations[].comments`             | string  | No       | Free-text notes                                       |
| `operations[].maturity_level`       | string  | No       | `L0`–`L5`                                             |
| `operations[].system_id`            | string  | No       | Collecting system UUID — get from `scf_list_systems`  |

---

## `scf_create_evidence_task`

Create a manual evidence collection task against a tracking record (write — editor role). Due date and `evidence_tracking_id` are required; status defaults to `not_started`, priority to `medium`.

| Parameter              | Type   | Required | Description                                                                                     |
| ---------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------- |
| `evidence_tracking_id` | string | Yes      | Tracking record UUID (the `id` from `scf_list_evidence`, not the `E-xxx` catalog ID)            |
| `due_date`             | string | Yes      | Due date, `YYYY-MM-DD`                                                                          |
| `title`                | string | No       | Task title                                                                                      |
| `description`          | string | No       | What has to be collected and how                                                                |
| `task_type`            | string | No       | `feasibility`, `setup`, `collection`, `review`, `documentation`, `issue` (default `collection`) |
| `priority`             | string | No       | `low`, `medium`, `high`, `critical` (default `medium`)                                          |
| `status`               | string | No       | `not_started`, `in_progress`, `completed` (default `not_started`)                               |
| `assigned_user_id`     | string | No       | Assignee UUID — get from `scf_list_members`                                                     |
| `owning_team_id`       | string | No       | Owning team UUID — get from `scf_list_teams`                                                    |

---

## `scf_update_evidence_task`

Update an evidence collection task (write — editor role). Only passed fields change: due date, status, type, priority, title, description, notes, assignee, owning team.

| Parameter          | Type   | Required | Description                                                              |
| ------------------ | ------ | -------- | ------------------------------------------------------------------------ |
| `task_id`          | string | Yes      | Evidence task UUID — get from `scf_list_evidence_tasks`                  |
| `due_date`         | string | No       | Due date, `YYYY-MM-DD`                                                   |
| `title`            | string | No       | Task title                                                               |
| `description`      | string | No       | What has to be collected and how                                         |
| `task_type`        | string | No       | `feasibility`, `setup`, `collection`, `review`, `documentation`, `issue` |
| `priority`         | string | No       | `low`, `medium`, `high`, `critical`                                      |
| `status`           | string | No       | `not_started`, `in_progress`, `completed`                                |
| `assigned_user_id` | string | No       | Assignee UUID — get from `scf_list_members`                              |
| `owning_team_id`   | string | No       | Owning team UUID — get from `scf_list_teams`                             |
| `completion_notes` | string | No       | Notes recorded on completion                                             |

---

## `scf_complete_evidence_task`

Mark an evidence collection task completed (write — editor role). Sets status to `completed` and stamps the completion date; optional completion notes are stored with it.

| Parameter          | Type   | Required | Description                                             |
| ------------------ | ------ | -------- | ------------------------------------------------------- |
| `task_id`          | string | Yes      | Evidence task UUID — get from `scf_list_evidence_tasks` |
| `completion_notes` | string | No       | Notes recorded on completion                            |

---

## `scf_review_evidence_file`

Approve, reject or request revision on an uploaded evidence file (write — editor role). Records the reviewer and time; notes are optional and shown with the decision.

| Parameter       | Type   | Required | Description                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                     |
| `evidence_id`   | string | Yes      | Catalog evidence ID the file belongs to (e.g., `E-IAM-01`) |
| `file_id`       | string | Yes      | Evidence file UUID — get from `scf_list_evidence_files`    |
| `review_status` | string | Yes      | `approved`, `rejected`, `needs_revision`                   |
| `review_notes`  | string | No       | Reviewer notes                                             |

---

## `scf_delete_evidence_file`

Soft-delete an evidence file (destructive write — editor role). The record is marked deleted and drops out of listings; the stored object is retained for audit and retention.

| Parameter     | Type   | Required | Description                                                |
| ------------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                                     |
| `evidence_id` | string | Yes      | Catalog evidence ID the file belongs to (e.g., `E-IAM-01`) |
| `file_id`     | string | Yes      | Evidence file UUID — get from `scf_list_evidence_files`    |

---

## `scf_get_upcoming_evidence`

List evidence whose next collection falls due within N days (read — viewer role), computed from each item's frequency and last upload. The daily "what is due" view.

| Parameter | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID)                       |
| `days`    | number | No       | Look-ahead window in days (1–90, default 14) |

---

## `scf_get_frequency_health`

Report evidence whose declared frequency disagrees with the observed upload cadence over the last 90 days (read — viewer role). Only misaligned items are returned.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_get_assessment_review_queue`

List AI verdicts waiting for a human decision, worst first (read — viewer role): most gaps, then most unassessable objectives, then least relevant, then oldest. `tier=window` (default) is the web app's **Awaiting confirmation** queue; `tier=file` lists per-file verdicts. Every entry says which it is in `kind`: window entries carry `window_assessment_id` (act with `scf_review_window_assessment_verdict`), file entries carry `file_id` (act with `scf_review_evidence_assessment`).

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID)                             |
| `tier`    | string | No       | `window` (default) or `file`                       |
| `status`  | string | No       | `awaiting`, `reviewed`, `all` (default `awaiting`) |
| `limit`   | number | No       | Page size (1–200, default 50)                      |
| `offset`  | number | No       | Pagination offset (default 0)                      |

---

## `scf_review_evidence_assessment`

Record a human decision on a file's current AI assessment (write — editor role). `confirmed` keeps the verdict; `overridden` needs a reason and at least one objective re-designation.

| Parameter                          | Type   | Required | Description                                                                           |
| ---------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `org_id`                           | string | Yes      | Organization ID (UUID)                                                                |
| `evidence_id`                      | string | Yes      | Catalog evidence ID the file belongs to (e.g., `E-IAM-01`)                            |
| `file_id`                          | string | Yes      | Evidence file UUID — get from `scf_list_evidence_files`                               |
| `decision`                         | string | Yes      | `confirmed` (AI verdict stands) or `overridden`                                       |
| `reason`                           | string | No       | Why the verdict is overridden — required when `overridden`                            |
| `ao_overrides`                     | array  | No       | Objectives to re-designate — required (≥1) when overriding, forbidden when confirming |
| `ao_overrides[].ao_id`             | string | Yes      | Assessment objective ID                                                               |
| `ao_overrides[].human_designation` | string | Yes      | `appears_satisfied`, `gap_identified`, `not_applicable`, `cannot_assess`              |
| `ao_overrides[].note`              | string | No       | Why, for this objective specifically                                                  |

---

## `scf_refresh_stale_window_assessments`

Queue a fresh windowed AI assessment for every evidence item whose newest file postdates its last assessment (write — editor role). Capped per run; returns how many were queued.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_review_window_assessment`

Set the acceptance review state of a windowed evidence assessment (write — editor role): `approved`, `rejected`, `needs_revision`, or `not_reviewed` to revoke a prior decision. This records what the organisation decided to do with the evidence; to confirm or override the AI's verdict itself use `scf_review_window_assessment_verdict`.

| Parameter       | Type   | Required | Description                                                     |
| --------------- | ------ | -------- | --------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                          |
| `ewa_id`        | string | Yes      | Window assessment UUID — get from `scf_list_window_assessments` |
| `review_status` | string | Yes      | `approved`, `rejected`, `needs_revision`, `not_reviewed`        |
| `review_notes`  | string | No       | Reviewer notes                                                  |

---

## `scf_review_window_assessment_verdict`

Confirm or override a window's current AI verdict (write — editor role). `confirmed` keeps the verdict as the AI produced it; `overridden` needs a reason and at least one objective re-designation, after which the window's status and gap counts are re-derived. One decision per version — re-assessing the window produces a new version that starts unreviewed. Independent of the acceptance review (`scf_review_window_assessment`). The platform returns 403 when the reviewer is the sole uploader of the window's files (segregation of duties) and 409 when the verdict is not reviewable or already decided.

| Parameter                          | Type   | Required | Description                                                                                             |
| ---------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `org_id`                           | string | Yes      | Organization ID (UUID)                                                                                  |
| `assessment_id`                    | string | Yes      | Window assessment UUID — `window_assessment_id` from the review queue, or `scf_list_window_assessments` |
| `decision`                         | string | Yes      | `confirmed` (AI verdict stands) or `overridden`                                                         |
| `reason`                           | string | No       | Why the verdict is overridden — required when `overridden`                                              |
| `ao_overrides`                     | array  | No       | Objectives to re-designate — required (≥1) when overriding, forbidden when confirming                   |
| `ao_overrides[].ao_id`             | string | Yes      | Assessment objective ID                                                                                 |
| `ao_overrides[].human_designation` | string | Yes      | `appears_satisfied`, `gap_identified`, `not_applicable`, `cannot_assess`                                |
| `ao_overrides[].note`              | string | No       | Why, for this objective specifically                                                                    |

---

## `scf_get_window_assessment_versions`

List every AI verdict a window assessment has received, newest first (read — viewer role). Each version is frozen as it was when the verdict was reached — model, prompt version, per-objective designations — plus any human confirm/override recorded against it.

| Parameter       | Type   | Required | Description                                                     |
| --------------- | ------ | -------- | --------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                          |
| `assessment_id` | string | Yes      | Window assessment UUID — get from `scf_list_window_assessments` |

---

## `scf_get_control_assessment_composite`

Get the rolled-up assessment composite for one SCF control: composite score, status band, included/missing evidence IDs, mandatory gaps, per-window detail. 404 if no composite row exists yet (async).

| Parameter | Type   | Required | Description                                                     |
| --------- | ------ | -------- | --------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations`      |
| `scf_id`  | string | Yes      | SCF control ID in `DOMAIN-NN` format (e.g., `AST-01`, `GOV-02`) |

---

## `scf_list_control_assessment_composites`

List rolled-up assessment composites for the org. Cursor-paginated, worst-band first (insufficient → sufficient). Filter by status/domain/computation_version. Pass `next_cursor` to page forward.

| Parameter             | Type   | Required | Description                                                              |
| --------------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `org_id`              | string | Yes      | Organization ID (UUID)                                                   |
| `status`              | string | No       | Comma-separated `composite_status` values (e.g., `insufficient,partial`) |
| `domain`              | string | No       | Filter by SCF domain code (e.g., `BCD`, `GOV`, `AST`)                    |
| `computation_version` | number | No       | Restrict to composites computed at this algorithm version                |
| `limit`               | number | No       | Page size (1–500, default 100)                                           |
| `cursor`              | string | No       | Opaque pagination cursor — pass `next_cursor` from a prior response      |

---

## Example prompts

- "What evidence do I need to collect for SOC 2 audit?"
- "Run AI assessment on the latest file uploaded to `E-IAM-01`."
- "Give me this month's evidence validation pass rate."
- "Trigger windowed assessments for all my `daily`-frequency evidence items."
- "Show evidence maturity by control domain."
