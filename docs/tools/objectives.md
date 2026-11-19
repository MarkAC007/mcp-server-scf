# Security Objectives and ISMS Metrics tools

Security objectives are the measurable goals ISO/IEC 27001 clause 6.2 asks an organisation to set; each objective carries one metric, the evidence of monitoring and measurement under clause 9.1. The platform keeps both in one register: an objective is created `proposed`, an admin confirms it, and from then on its metric is measured (live from a library measure, logged by people at a frequency, or a milestone done by a due date) and judged against its target.

Properties worth knowing before calling any of these:

- **The first read adds starters.** The first time an organisation's register is read, the platform adds its proposed starter objectives, so the register is never empty. They are `proposed` until an admin confirms them.
- **Roles.** Reads take viewer. Creating, editing, logging a value and recording an evaluation take editor. Confirming takes **admin**. Once an objective is confirmed, setting its metric or target, changing its type or due date, and closing or reopening it take admin too.
- **Nothing is removed.** Results are never changed or removed: a correction is a new entry for the same period. Setting a metric closes the one in force and opens a new version, so the history is kept. Evaluations are kept as recorded.
- **No archive, no delete.** The platform has no delete route for objectives, metrics or results, and this group wraps none. Archiving stays a decision a person makes in the web app: `scf_update_security_objective` has no `archived` field and sends only the fields it names.
- **Closing is not deleting.** `lifecycle_status` closes a confirmed objective as `achieved` or `missed` and can set it back to `active`. It is refused while the objective is still `proposed`.

Source: [`src/tools/objectives.ts`](../../src/tools/objectives.ts). Request shapes mirror the platform's `backend/services/isms_metrics/schemas.py`.

<!-- consolidated-surface -->

> **Tool surface (v4).** The operations below are exposed as the following tools; pass the operation as `method`. This group is not in the core set: call `scf_load_tools` with `objectives` first. Full mapping: [`migration-consolidation.md`](../migration-consolidation.md).
>
> - `scf_objective_read` (load `objectives`): `list` = `scf_list_security_objectives`, `get` = `scf_get_security_objective`, `metric` = `scf_get_isms_metric`, `measures` = `scf_list_isms_measures`, `measurement_tasks` = `scf_list_isms_measurement_tasks`
> - `scf_objective_write` (load `objectives`): `create` = `scf_create_security_objective`, `update` = `scf_update_security_objective`, `set_metric` = `scf_set_objective_metric`, `confirm` = `scf_confirm_security_objective`, `log_value` = `scf_log_isms_metric_value`, `record_evaluation` = `scf_record_objective_evaluation`

The 11 tools split into three concerns:

1. **Reading the register** — `scf_list_security_objectives`, `scf_get_security_objective`, `scf_get_isms_metric`, `scf_list_isms_measures`
2. **Setting objectives up** — `scf_create_security_objective`, `scf_update_security_objective`, `scf_set_objective_metric`, `scf_confirm_security_objective`
3. **Measuring and evaluating** — `scf_list_isms_measurement_tasks`, `scf_log_isms_metric_value`, `scf_record_objective_evaluation`

A typical flow: `scf_list_isms_measures` to pick a `measure_key`, `scf_create_security_objective` with a `metric`, `scf_confirm_security_objective` (admin), then, each period, `scf_list_isms_measurement_tasks` to see which logged values are due and `scf_log_isms_metric_value` to log them, and `scf_record_objective_evaluation` at management review.

Not wrapped: `GET …/isms-metrics` (the dashboard; the same builder as the register, so `scf_list_security_objectives` returns the same readings) and `POST …/isms-metrics/wording` (form feedback for the web app). Both verdicts are in [`../tool-scope.md`](../tool-scope.md).

---

## `scf_list_security_objectives`

List the security objectives register with today's reading of each (read — viewer). The first read adds the platform's proposed starter objectives to an empty register.

| Parameter          | Type    | Required | Description                                            |
| ------------------ | ------- | -------- | ------------------------------------------------------ |
| `org_id`           | string  | Yes      | Organization UUID — obtain from scf_list_organizations |
| `include_archived` | boolean | No       | Include archived objectives (default false)            |

---

## `scf_get_security_objective`

Get one security objective with its metric in force and today's reading (read — viewer).

| Parameter      | Type   | Required | Description                                                                                               |
| -------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `org_id`       | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                    |
| `objective_id` | string | Yes      | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id) |

---

## `scf_get_isms_metric`

Get one ISMS metric in detail: reading, trend, pace to target, logged results and the breakdown behind a live value (read — viewer).

| Parameter         | Type   | Required | Description                                                                                               |
| ----------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `org_id`          | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                    |
| `objective_id`    | string | Yes      | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id) |
| `breakdown_limit` | number | No       | Rows of the live value's breakdown to return, 1–50 (default 10)                                           |

---

## `scf_list_isms_measures`

List the live measure library with each measure's value today, best matches first when text is given (read — viewer). Pick measure_key for a live metric here.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `text`    | string | No       | Words to match, e.g. 'mfa' or 'phishing'               |

---

## `scf_create_security_objective`

Add a security objective (write — editor). It is always created proposed; an admin confirms it. Pass metric to set its first measure and target.

| Parameter           | Type     | Required | Description                                                                                            |
| ------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `org_id`            | string   | Yes      | Organization UUID — obtain from scf_list_organizations                                                 |
| `name`              | string   | Yes      | The objective, e.g. 'Phishing click rate stays under 5%'                                               |
| `planned_actions`   | string   | No       | What will be done to achieve it                                                                        |
| `resources`         | string   | No       | Resources it needs                                                                                     |
| `evaluation_method` | string   | No       | How its results will be evaluated                                                                      |
| `objective_type`    | enum     | No       | maintain = hold a level continuously; achieve = reach it by the due date. One of `maintain`, `achieve` |
| `owning_team_id`    | string   | No       | Responsible team UUID — obtain from scf_list_teams                                                     |
| `owner_user_id`     | string   | No       | Accountable member UUID — obtain from scf_list_members                                                 |
| `due_date`          | string   | No       | When the objective is to be achieved (YYYY-MM-DD)                                                      |
| `review_date`       | string   | No       | Next review (YYYY-MM-DD)                                                                               |
| `iso_clauses`       | string[] | No       | ISO/IEC 27001 clauses or Annex A controls it supports, e.g. ['6.2', 'A.5.24'] (at most 20)             |
| `metric`            | object   | No       | First metric: kind plus measure_key (live), or unit, direction and frequency (logged), and the target  |

---

## `scf_update_security_objective`

Edit an objective (write — editor; only passed fields change). Once confirmed, changing type or due date, or closing it, takes an admin. Cannot archive or delete.

| Parameter           | Type     | Required | Description                                                                                                                                                                        |
| ------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`            | string   | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                             |
| `objective_id`      | string   | Yes      | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id)                                                                          |
| `name`              | string   | No       | New wording of the objective                                                                                                                                                       |
| `planned_actions`   | string   | No       | What will be done to achieve it                                                                                                                                                    |
| `resources`         | string   | No       | Resources it needs                                                                                                                                                                 |
| `evaluation_method` | string   | No       | How its results will be evaluated                                                                                                                                                  |
| `objective_type`    | enum     | No       | maintain = hold a level continuously; achieve = reach it by the due date. One of `maintain`, `achieve`                                                                             |
| `owning_team_id`    | string   | No       | Responsible team UUID — obtain from scf_list_teams; `null` clears                                                                                                                  |
| `owner_user_id`     | string   | No       | Accountable member UUID — obtain from scf_list_members; `null` clears                                                                                                              |
| `owner_text`        | string   | No       | Owner named in words when not a member; null clears                                                                                                                                |
| `due_date`          | string   | No       | When the objective is to be achieved (YYYY-MM-DD); `null` clears                                                                                                                   |
| `review_date`       | string   | No       | Next review (YYYY-MM-DD); `null` clears                                                                                                                                            |
| `iso_clauses`       | string[] | No       | ISO/IEC 27001 clauses or Annex A controls it supports, e.g. ['6.2', 'A.5.24'] (at most 20)                                                                                         |
| `lifecycle_status`  | enum     | No       | Close a confirmed objective as achieved or missed, or reopen it as active (admin once confirmed; refused while proposed — confirm it first). One of `active`, `achieved`, `missed` |

---

## `scf_set_objective_metric`

Set an objective's measure and target (write — editor while proposed, admin once confirmed). The metric in force is closed and a new version opened; history is kept.

| Parameter           | Type   | Required | Description                                                                                                                                                                                    |
| ------------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`            | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                         |
| `objective_id`      | string | Yes      | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id)                                                                                      |
| `kind`              | enum   | Yes      | live = computed by the platform from a library measure (needs measure_key); logged = a value people log at a frequency; milestone = done by the due date. One of `live`, `logged`, `milestone` |
| `measure_key`       | string | No       | Library measure for a live metric — obtain from scf_list_isms_measures                                                                                                                         |
| `params`            | object | No       | Parameters the chosen measure takes, as scf_list_isms_measures lists them                                                                                                                      |
| `name`              | string | No       | Metric name; the platform words one from the measure when omitted                                                                                                                              |
| `description`       | string | No       | What the metric measures, in the organization's words                                                                                                                                          |
| `unit`              | enum   | No       | percent or count (logged metrics; a live measure carries its own). One of `percent`, `count`                                                                                                   |
| `direction`         | enum   | No       | at_least = higher is better; at_most = lower is better. One of `at_least`, `at_most`                                                                                                           |
| `target_value`      | number | No       | Target the result is judged against                                                                                                                                                            |
| `warn_value`        | number | No       | Warning level: a reading that misses the target but is within this is at_risk; beyond it, off_track                                                                                            |
| `frequency`         | enum   | No       | How often a logged value is due. One of `monthly`, `quarterly`, `annually`                                                                                                                     |
| `evaluation_method` | string | No       | How the result is evaluated                                                                                                                                                                    |

---

## `scf_confirm_security_objective`

Confirm a proposed objective so it becomes active (write — ADMIN). Needs a team, a metric, and a target (live, logged) or due date (milestone), set before or passed here.

| Parameter        | Type   | Required | Description                                                                                               |
| ---------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `org_id`         | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                    |
| `objective_id`   | string | Yes      | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id) |
| `owning_team_id` | string | No       | Responsible team UUID — obtain from scf_list_teams                                                        |
| `target_value`   | number | No       | Target the result is judged against                                                                       |
| `warn_value`     | number | No       | Warning level: a reading that misses the target but is within this is at_risk; beyond it, off_track       |
| `due_date`       | string | No       | When the objective is to be achieved (YYYY-MM-DD)                                                         |
| `review_date`    | string | No       | Next review (YYYY-MM-DD)                                                                                  |

---

## `scf_list_isms_measurement_tasks`

This period's measurement tasks (read — viewer): one per logged metric whose value is due, due date first. Derived when read, nothing is stored; log the value with scf_log_isms_metric_value.

| Parameter        | Type    | Required | Description                                                               |
| ---------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `org_id`         | string  | Yes      | Organization UUID — obtain from scf_list_organizations                    |
| `assigned_to_me` | boolean | No       | Only tasks whose reminder goes to the caller (default false)              |
| `include_done`   | boolean | No       | Also list tasks whose value is already logged this period (default false) |

How many days before the end of the period the owner is reminded is the organization setting `isms_measurement_reminder_days`, set with `scf_update_org_settings` (see [organization.md](organization.md)).

---

## `scf_log_isms_metric_value`

Log a result for a logged or milestone metric (write — editor; milestone: 1 done, 0 not), by objective_id or ref (OBJ-09). Results are never changed or removed: a correction is a new entry.

| Parameter      | Type   | Required | Description                                                                                                                                                                                                |
| -------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`       | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                     |
| `objective_id` | string | No       | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id)                                                                                                  |
| `ref`          | string | No       | The objective's ref, e.g. OBJ-09, instead of objective_id — as scf_list_security_objectives shows it. Meant for collectors: an API key repeating the newest value is answered without writing a new result |
| `value`        | number | Yes      | The measured value in the metric's unit (percent 0–100, count ≥ 0); for a milestone 1 = done, 0 = not done                                                                                                 |
| `period_start` | string | No       | A date in the period the value covers (moved to that period's start); the current period when omitted (YYYY-MM-DD)                                                                                         |
| `note`         | string | No       | Where the value came from, or why it corrects an earlier entry                                                                                                                                             |
| `collector`    | string | No       | Name of the automated collector that measured the value, e.g. 'jumpcloud-patch-report'. Accepted only from an API key caller                                                                               |

Pass exactly one of `objective_id` or `ref`. The tool refuses a call with both or neither before it reaches the platform. `ref` is `OBJ-` followed by up to six digits. `collector` is up to 80 characters: letters, digits, spaces and `. _ : / -`, starting with a letter or digit.

---

## `scf_record_objective_evaluation`

Record that an objective's results were evaluated, with a note (write — editor). Clause 9.1 evidence; the record is kept, not edited.

| Parameter      | Type   | Required | Description                                                                                               |
| -------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `org_id`       | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                    |
| `objective_id` | string | Yes      | Security objective UUID — obtain from scf_list_security_objectives (the metric shares the objective's id) |
| `note`         | string | Yes      | What was evaluated, the conclusion, and who took part                                                     |
