# Assurance tools

The records an organisation keeps to show its controls work and that it is exercising due care: control deficiencies, compensating controls for its own controls, the due-care pack (control validation and monthly posture snapshots), and capability tests. These are the organisation-level counterparts of the vendor action items and vendor compensating controls in [vendors.md](vendors.md).

Source: [`src/tools/assurance.ts`](../../src/tools/assurance.ts).

The 19 tools split into four concerns:

1. **Deficiencies** — `scf_list_deficiencies`, `scf_get_deficiency_summary`, `scf_get_deficiency`, `scf_create_deficiency`, `scf_update_deficiency`
2. **Organisation compensating controls** — `scf_list_org_compensating_controls`, `scf_get_org_compensating_control`, `scf_create_org_compensating_control`, `scf_update_org_compensating_control`
3. **Due care** — `scf_record_control_validation`, `scf_list_control_validations`, `scf_list_posture_snapshots`, `scf_get_posture_snapshot`, `scf_take_posture_snapshot`
4. **Capability tests** — `scf_list_capability_tests`, `scf_get_capability_test`, `scf_create_capability_test`, `scf_update_capability_test`, `scf_add_capability_test_finding`

Reads need the viewer role; every write needs editor. Things worth knowing before calling these:

- **The platform raises deficiencies itself.** Marking a control `at_risk`, an insufficient control composite, rejecting evidence, and capability-test findings each raise one; `source` says which (`control_at_risk`, `composite_insufficient`, `evidence_rejected`, `capability_test`, or null for one raised by hand). A deficiency cannot be deleted: cancel it. Completing one needs a `retest_note`.
- **A compensating control on a material control must be justified.** It needs `risk_code`: an accepted risk linked to that control, with an approval in force (409 otherwise). `justified` turns false later if the acceptance lapses, is withdrawn or unlinked, or the control becomes material.
- **A month has one posture snapshot.** The schedule takes it on the first of the month; `scf_take_posture_snapshot` takes it sooner and is refused (409) once the month has one.
- **A capability test's result must agree with its findings.** `passed` has none; `passed_with_findings` and `failed` need at least one. Each finding is recorded as a deficiency linked to the test, and is managed as a deficiency from then on.

---

## `scf_list_deficiencies`

List the organisation's control deficiencies, newest first: hand-raised ones and those the platform raises (control at risk, insufficient composite, rejected evidence, capability tests).

| Parameter            | Type    | Required | Description                                                              |
| -------------------- | ------- | -------- | ------------------------------------------------------------------------ |
| `org_id`             | string  | Yes      | Organization UUID — obtain from scf_list_organizations                   |
| `status`             | string  | No       | Filter by status: open, in_progress, completed, cancelled                |
| `open_only`          | boolean | No       | Only open and in-progress deficiencies                                   |
| `scf_id`             | string  | No       | Deficiencies against this control — obtain from scf_list_scoped_controls |
| `domain`             | string  | No       | Deficiencies against controls in this SCF domain code                    |
| `risk_code`          | string  | No       | Deficiencies against this risk code                                      |
| `capability_test_id` | string  | No       | Findings of this capability test — obtain from scf_list_capability_tests |

---

## `scf_get_deficiency_summary`

Summarise open deficiencies: open_total, material_open_total, unlinked_open, and open counts per control (with material flag) and per domain.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_get_deficiency`

Get one deficiency: title, priority, status, owner, due date, control or risk it is against, source, root cause, retest note and who closed it.

| Parameter       | Type   | Required | Description                                            |
| --------------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `deficiency_id` | string | Yes      | Deficiency UUID — obtain from scf_list_deficiencies    |

---

## `scf_create_deficiency`

Raise a deficiency by hand (write — editor) against an in-scope control, an assessed risk, or both. At least one of scf_id or risk_code is required. Starts open.

| Parameter       | Type   | Required | Description                                                                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                     |
| `title`         | string | Yes      | Short title (1–255 chars, non-blank)                                                                       |
| `description`   | string | No       | What is deficient                                                                                          |
| `priority`      | string | No       | Priority: critical, high, medium, low (platform default medium)                                            |
| `owner_name`    | string | No       | Free-text owner                                                                                            |
| `owner_user_id` | string | No       | Owner user — must be a member of the organisation (404 otherwise); see scf_list_members                    |
| `due_date`      | string | No       | Due date (YYYY-MM-DD)                                                                                      |
| `scf_id`        | string | No       | Control the deficiency is against — must be in scope (422 otherwise); obtain from scf_list_scoped_controls |
| `risk_code`     | string | No       | Risk the deficiency is against — must be one the organisation has assessed (422 otherwise)                 |
| `root_cause`    | string | No       | Why the deficiency arose                                                                                   |

---

## `scf_update_deficiency`

Update a deficiency (write — editor). Only passed fields change. Completing needs a retest_note. There is no delete: set status cancelled instead.

| Parameter       | Type           | Required | Description                                                                                                                                                                                                                |
| --------------- | -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`        | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                     |
| `deficiency_id` | string         | Yes      | Deficiency UUID — obtain from scf_list_deficiencies                                                                                                                                                                        |
| `title`         | string         | No       | New title (cannot be cleared)                                                                                                                                                                                              |
| `description`   | string \| null | No       | New description, or null to clear                                                                                                                                                                                          |
| `priority`      | string         | No       | Priority: critical, high, medium, low (cannot be cleared)                                                                                                                                                                  |
| `status`        | string         | No       | Status: open, in_progress, completed, cancelled (cannot be cleared). Moving to completed needs retest_note (422 otherwise). Restoring a cancelled capability-test finding is refused while that test is recorded as passed |
| `owner_name`    | string \| null | No       | Free-text owner, or null to clear                                                                                                                                                                                          |
| `owner_user_id` | string \| null | No       | Owner user (must be an org member, 404 otherwise), or null to clear                                                                                                                                                        |
| `due_date`      | string \| null | No       | Due date (YYYY-MM-DD), or null to clear                                                                                                                                                                                    |
| `retest_note`   | string         | No       | What was retested and the result. Required to complete. Ignored when reopening: a reopened deficiency starts without one                                                                                                   |
| `root_cause`    | string \| null | No       | Why it arose; null or blank clears it                                                                                                                                                                                      |

---

## `scf_list_org_compensating_controls`

List compensating controls recorded against the organisation's own controls (not vendor ones), with material, risk_acceptance_state and justified flags.

| Parameter   | Type   | Required | Description                                                |
| ----------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization UUID — obtain from scf_list_organizations     |
| `scf_id`    | string | No       | Compensating controls for this control                     |
| `domain`    | string | No       | Compensating controls for controls in this SCF domain code |
| `risk_code` | string | No       | Compensating controls justified by this risk code          |

---

## `scf_get_org_compensating_control`

Get one organisation compensating control: gap, what compensates, effectiveness, risk_code, and whether it is still justified.

| Parameter | Type   | Required | Description                                                                |
| --------- | ------ | -------- | -------------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations                     |
| `cc_id`   | string | Yes      | Compensating control UUID — obtain from scf_list_org_compensating_controls |

---

## `scf_create_org_compensating_control`

Record a compensating control for an in-scope control (write — editor). A material control needs risk_code: an accepted, linked risk with an approval in force (409 otherwise).

| Parameter              | Type   | Required | Description                                                                                                                                                       |
| ---------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`               | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                            |
| `scf_id`               | string | Yes      | Control the gap is in — must be in scope (422 otherwise); obtain from scf_list_scoped_controls                                                                    |
| `gap_description`      | string | Yes      | What the control does not meet (non-blank)                                                                                                                        |
| `compensating_control` | string | Yes      | What compensates for the gap (non-blank)                                                                                                                          |
| `effectiveness_rating` | string | No       | Effectiveness: full, partial, minimal (platform default partial)                                                                                                  |
| `risk_reduction_notes` | string | No       | Notes on how the risk is reduced                                                                                                                                  |
| `risk_code`            | string | No       | Accepted risk that justifies compensating: one linked to the control and assessed by the org. Required on a material control, where its approval must be in force |

---

## `scf_update_org_compensating_control`

Update an organisation compensating control (write — editor). Only passed fields change; the control it is for does not. A changed risk_code is re-checked (409).

| Parameter              | Type           | Required | Description                                                                                         |
| ---------------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `org_id`               | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                              |
| `cc_id`                | string         | Yes      | Compensating control UUID — obtain from scf_list_org_compensating_controls                          |
| `gap_description`      | string         | No       | What the control does not meet (cannot be cleared)                                                  |
| `compensating_control` | string         | No       | What compensates (cannot be cleared)                                                                |
| `effectiveness_rating` | string         | No       | Effectiveness: full, partial, minimal (cannot be cleared)                                           |
| `risk_reduction_notes` | string \| null | No       | Risk reduction notes, or null to clear                                                              |
| `risk_code`            | string \| null | No       | Justifying accepted risk, re-checked as on create; null clears it, which a material control refuses |

---

## `scf_record_control_validation`

Record that an in-scope control was validated (write — editor): the note is the record. The control's cadence then sets when the next validation is due.

| Parameter | Type   | Required | Description                                                             |
| --------- | ------ | -------- | ----------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations                  |
| `scf_id`  | string | Yes      | In-scope control (422 otherwise) — obtain from scf_list_scoped_controls |
| `note`    | string | Yes      | What was checked and what was found (required, non-blank)               |

---

## `scf_list_control_validations`

List the validation schedule: each in-scope control's cadence, last validation, next due date and state, plus counts per state (taken before the state filter).

| Parameter | Type   | Required | Description                                                                                                |
| --------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                     |
| `state`   | string | No       | Filter by state: current, due_soon (due within 30 days), overdue, never (not validated) or unknown_cadence |
| `domain`  | string | No       | Controls in this SCF domain code                                                                           |
| `scf_id`  | string | No       | One control                                                                                                |

---

## `scf_list_posture_snapshots`

List the organisation's monthly posture snapshots, most recent month first: period, when and how taken (scheduled or manual), and the counts recorded.

| Parameter | Type    | Required | Description                                            |
| --------- | ------- | -------- | ------------------------------------------------------ |
| `org_id`  | string  | Yes      | Organization UUID — obtain from scf_list_organizations |
| `limit`   | integer | No       | How many months to return (1–120, default 24)          |

---

## `scf_get_posture_snapshot`

Get one month's posture snapshot by period (YYYY-MM). 404 if that month has none.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `period`  | string | Yes      | Month of the snapshot, YYYY-MM (e.g. 2026-09)          |

---

## `scf_take_posture_snapshot`

Take this month's posture snapshot now (write — editor). The schedule takes one on the 1st; a month has one snapshot, so a second is refused (409).

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_list_capability_tests`

List capability tests (incident response exercises, continuity tests, others), most recently run first, with finding_count and open_finding_count.

| Parameter   | Type   | Required | Description                                            |
| ----------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`    | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `test_type` | string | No       | Filter by type: incident_response, continuity, other   |
| `since`     | string | No       | Tests run on or after this date (YYYY-MM-DD)           |

---

## `scf_get_capability_test`

Get one capability test with its findings, each returned as a deficiency.

| Parameter | Type   | Required | Description                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations       |
| `test_id` | string | Yes      | Capability test UUID — obtain from scf_list_capability_tests |

---

## `scf_create_capability_test`

Record a capability test as run (write — editor). Each finding becomes a deficiency. passed needs no findings; passed_with_findings or failed need at least one (422).

| Parameter   | Type   | Required | Description                                                                                          |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization UUID — obtain from scf_list_organizations                                               |
| `test_type` | string | Yes      | Kind of test: incident_response, continuity, other                                                   |
| `title`     | string | Yes      | Short title (1–255 chars, non-blank)                                                                 |
| `tested_on` | string | Yes      | Day the test was run (YYYY-MM-DD); not in the future (422)                                           |
| `scenario`  | string | Yes      | What was tested, and how (non-blank)                                                                 |
| `result`    | string | Yes      | Result: passed, passed_with_findings, failed. passed means no findings; the others need at least one |
| `outcome`   | string | Yes      | What happened, and what was learned (non-blank)                                                      |
| `findings`  | array  | No       | Findings (up to 100); each is recorded as a deficiency linked to the test                            |

---

## `scf_update_capability_test`

Correct a capability test (write — editor). Only passed fields change; none can be cleared. findings sent here are added. The result must still agree with the findings.

| Parameter   | Type   | Required | Description                                                                                                                                                                                  |
| ----------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                       |
| `test_id`   | string | Yes      | Capability test UUID — obtain from scf_list_capability_tests                                                                                                                                 |
| `test_type` | string | No       | Kind of test: incident_response, continuity, other                                                                                                                                           |
| `title`     | string | No       | New title                                                                                                                                                                                    |
| `tested_on` | string | No       | Day the test was run (YYYY-MM-DD); not in the future                                                                                                                                         |
| `scenario`  | string | No       | What was tested, and how                                                                                                                                                                     |
| `result`    | string | No       | Result: passed, passed_with_findings, failed. Checked against recorded findings (cancelled excluded) plus any sent here; to correct passed to failed, send the result and a finding together |
| `outcome`   | string | No       | What happened, and what was learned                                                                                                                                                          |
| `findings`  | array  | No       | Findings to add with this correction. Existing findings are managed as deficiencies                                                                                                          |

---

## `scf_add_capability_test_finding`

Add a finding to a capability test (write — editor); it is recorded as a deficiency linked to the test. Refused on a test recorded as passed: correct its result instead.

| Parameter       | Type   | Required | Description                                                                             |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                  |
| `test_id`       | string | Yes      | Capability test UUID — obtain from scf_list_capability_tests                            |
| `title`         | string | Yes      | Short title of the finding (1–255 chars, non-blank)                                     |
| `description`   | string | No       | What was found                                                                          |
| `priority`      | string | No       | Priority: critical, high, medium, low (platform default medium)                         |
| `owner_name`    | string | No       | Free-text owner                                                                         |
| `owner_user_id` | string | No       | Owner user — must be a member of the organisation (404 otherwise); see scf_list_members |
| `due_date`      | string | No       | Due date (YYYY-MM-DD)                                                                   |
| `scf_id`        | string | No       | Control the finding is against, if any — must be in scope (422 otherwise)               |
| `risk_code`     | string | No       | Risk the finding is against, if any — must be assessed                                  |
| `root_cause`    | string | No       | Why the finding arose                                                                   |

---

## Example prompts

- "Which material controls have open deficiencies, and who owns them?"
- "Raise a high-priority deficiency against our access review control: the Q3 review was never signed off."
- "Close that deficiency — we re-ran the review and it passed."
- "Record a compensating control for the MFA gap, justified by our accepted risk."
- "Which controls are overdue for validation?"
- "Take this month's posture snapshot and compare it with last month's."
- "Record yesterday's ransomware tabletop exercise: passed with two findings."
