# Guided Journey tools

The journey is the staged path an organisation walks, authored by a practitioner outside the platform and stored for one organisation at a time. The platform never treats a journey as product content: it holds what was uploaded, evaluates each stage's preconditions for display, and records who passed each stage.

Two properties are worth knowing before calling any of these:

- **Nothing advances a stage on computed evidence.** Preconditions are evaluated so a stage can _show_ whether it looks ready; only an attestation by a named person moves it to passed. `scf_attest_journey_stage` is the sole write that does so.
- **Reading is never a write.** An organisation with no journey still gets a rendered preview of the deployment's default template from `scf_get_journey` — a preview, not a journey created behind their back.

Source: [`src/tools/journey.ts`](../../src/tools/journey.ts).

The 4 tools split into two concerns:

1. **Reading the path** — `scf_get_journey`, `scf_list_journey_templates`
2. **Setting and advancing it** — `scf_import_journey`, `scf_attest_journey_stage`

---

## `scf_get_journey`

Get the organization's guided journey — the staged path it walks, with preconditions evaluated (read — viewer role). Never writes: an org without a journey sees the default template as a preview.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

Stage IDs for `scf_attest_journey_stage` come from this call.

---

## `scf_list_journey_templates`

List the journey templates this deployment ships (read — viewer role). If importing a returned template_key 404s, the file's declared key differs from its filename stem — import by the stem.

The platform resolves an import against a file on disk by its **filename stem**, but lists each template by the `template_key` declared inside the file. An operator who renames a template file makes the two disagree; when the listed key 404s on import, pass the stem.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_import_journey`

Set or re-issue the org's journey from a template (write — ADMIN role). Merges by stage key: attestations survive; dropping an attested stage is refused (409). An uploaded `template` wins outright.

Re-issuing a revised journey is safe: stages are merged on their `key`, so an attested stage keeps its attestation, and a template that would drop an attested stage is refused with a 409 rather than silently discarding the record. This route requires the **admin** role, not editor.

| Parameter           | Type    | Required | Description                                                                                           |
| ------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `org_id`            | string  | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                                            |
| `template_key`      | string  | No       | Template to import — get from `scf_list_journey_templates`. A bare filename stem; no path separators. |
| `activate`          | boolean | No       | Start the first stage immediately (default `false`)                                                   |
| `practitioner_name` | string  | No       | The consultancy or practitioner recorded as having set this journey up                                |
| `template`          | object  | No       | A practitioner-authored artefact to upload. When present it wins over `template_key` entirely.        |

`template` carries `template_key`, `template_version`, `name`, `description` and `stages` (at least one). Each stage carries `key`, `title`, `summary`, `expect_next` and `precondition_spec`.

`template_key` is validated as a bare filename stem at the tool boundary because the platform resolves it against a template file on disk and refuses anything path-shaped. The platform repeats the check and adds a resolved-path containment test; neither side is permitted to be the only one.

### Precondition checks

Each entry in a stage's `precondition_spec` is an object with a `type`, an optional `label`, and the parameters that type takes. The platform evaluates them for display only. A type it does not know, or a parameter the type does not take, reads as "cannot evaluate" — never as met. An unknown control ID in `scf_ids` or an unknown domain code in `domains` is refused when the template is uploaded (422).

Defaults: `min_fraction` 1.0, `min_count` 1, `max_count` 0. `domains` are SCF domain codes; `scf_ids` are catalogue control IDs.

| Type                                  | Parameters                                                            | Passes when                                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frameworks_scoped`                   | `min_count`                                                           | At least `min_count` frameworks are actively scoped                                                                                                                                 |
| `controls_with_decision`              | `min_fraction`, `domains`, `scf_ids`                                  | That fraction of in-scope controls has a scoping decision                                                                                                                           |
| `controls_with_owner`                 | `min_fraction`, `domains`, `scf_ids`                                  | That fraction of in-scope controls has an owner                                                                                                                                     |
| `controls_at_status`                  | `statuses`, `min_fraction`, `domains`, `scf_ids`                      | That fraction of in-scope controls is at one of `statuses`                                                                                                                          |
| `controls_at_risk_max`                | `max_count`, `domains`, `scf_ids`                                     | No more than `max_count` in-scope controls are `at_risk`                                                                                                                            |
| `documents_approved`                  | `min_count`, `generator`, `within_days` (1–3660)                      | Enough documents are approved or published. `generator` names one generator, e.g. `soa`, or `<generator>:<domain>` such as `policy:GOV`; `within_days` counts only recent approvals |
| `evidence_items_tracked`              | `min_count`                                                           | Enough evidence items are tracked                                                                                                                                                   |
| `evidence_files_uploaded`             | `min_count`                                                           | Enough evidence files are uploaded                                                                                                                                                  |
| `evidence_upload_spread_days`         | `min_days` (default 30)                                               | Uploads span at least `min_days` days                                                                                                                                               |
| `engagement_exists`                   | —                                                                     | An audit engagement exists                                                                                                                                                          |
| `frameworks_with_basis`               | `basis` (`mcr` or `dsr`, required), `min_count`                       | Enough scoped frameworks carry that obligation basis                                                                                                                                |
| `controls_with_basis`                 | `basis` (optional), `min_fraction`, `domains`, `scf_ids`              | That fraction of in-scope controls has a basis (or the given one)                                                                                                                   |
| `systems_with_criticality`            | `min_fraction`                                                        | That fraction of in-scope systems (undecided ones count) has a criticality; fails when no system is marked in scope                                                                 |
| `controls_with_target`                | `min_fraction`, `domains`, `scf_ids`                                  | That fraction of in-scope controls has a target maturity; an empty scope fails                                                                                                      |
| `controls_at_target`                  | `min_fraction`, `domains`, `scf_ids`                                  | That fraction of in-scope controls has reached its target; an unrated control is never at target                                                                                    |
| `material_controls_at_status`         | `statuses` (required), `min_fraction`, `domains`, `scf_ids`           | That fraction of material controls is at one of `statuses`; fails when there are no material controls                                                                               |
| `risks_accepted_without_approver_max` | `max_count`                                                           | No more than `max_count` risks are accepted with no approval recorded                                                                                                               |
| `open_deficiencies_max`               | `max_count`, `domains`                                                | No more than `max_count` deficiencies are open                                                                                                                                      |
| `material_deficiencies_max`           | `max_count`, `domains`                                                | No more than `max_count` open deficiencies sit on material controls                                                                                                                 |
| `controls_validated_within_cadence`   | `min_fraction`, `domains`, `scf_ids`                                  | That fraction of in-scope controls is validated within its cadence; an unknown cadence counts against; an empty scope fails                                                         |
| `capability_tests_within_days`        | `days` (1–3660, required), `min_count`, `test_types` (non-empty list) | At least `min_count` capability tests of those types (`incident_response`, `continuity`, `other`) were run in the last `days` days, both ends counted; any result counts            |

Example: `{"type": "documents_approved", "generator": "soa"}` passes once the Statement of Applicability is approved.

---

## `scf_attest_journey_stage`

Pass a journey stage by named attestation (write — editor+). The ONLY way a stage passes — nothing advances on computed evidence — and who attested is recorded. A conditional pass needs target_date.

| Parameter     | Type    | Required | Description                                                               |
| ------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `org_id`      | string  | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                |
| `stage_id`    | string  | Yes      | Journey stage ID (UUID) — get from `scf_get_journey`                      |
| `note`        | string  | No       | What was checked, and by whom, in the attester's own words                |
| `conditional` | boolean | No       | Pass with named items still outstanding (default `false`)                 |
| `target_date` | string  | No       | When outstanding items are due (`YYYY-MM-DD`) — required when conditional |
