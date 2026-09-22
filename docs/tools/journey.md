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
