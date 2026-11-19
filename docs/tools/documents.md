# Document tools

Generate, edit and publish ISMS documents from the organization's scoped controls.

A generator produces a document as a set of sections. A human may edit any section, and
that edit is tracked as its own layer — so when the generator runs again the platform
reports a **conflict** rather than overwriting the edit, or marks a section
**pending retirement** when the generator no longer produces it. Nothing regenerates by
itself; a document that has drifted from current org inputs is flagged `is_stale` and
left alone.

The 20 tools split into six concerns:

1. **Discovery** — `scf_list_document_generators`, `scf_list_document_domains`
2. **Configuration** — `scf_get_document_settings`, `scf_update_document_settings`
3. **Generation** — `scf_generate_documents`, `scf_get_document_generation_status`
4. **Reading and editing** — `scf_list_documents`, `scf_get_document`, `scf_update_document_section`, `scf_get_document_section_generated`, `scf_resolve_document_section`
5. **Lifecycle and output** — `scf_transition_document`, `scf_get_document_history`, `scf_export_document`, `scf_preview_document`
6. **Document structure and the ISMS profile** — `scf_list_document_scopes`, `scf_get_document_map`, `scf_preview_document_profile`, `scf_get_isms_profile`, `scf_update_isms_profile_section`

> **Document profile:** the organization's document profile decides how controls are
> grouped into policies, standards and procedures. Switching it with
> `scf_update_document_settings` (`document_profile`) supersedes documents, so call
> `scf_preview_document_profile` first to see what it would supersede, create and keep.

> **ISMS profile:** the scope statement, context issues, interested parties, communication
> plan and audit programme. `scf_update_isms_profile_section` replaces a whole section, so
> read it with `scf_get_isms_profile`, change it, and send all of it back with its row ids.

> **Licence gate:** generation stays blocked until the SCF content licence is acknowledged
> via `scf_update_document_settings` with `acknowledge_licence: true`.

> **PDF export is not exposed.** The platform renders PDF, but a binary is the wrong
> payload for a stdio tool result — `scf_export_document` offers `md` and `html`.

Source: [`src/tools/documents.ts`](../../src/tools/documents.ts).

<!-- consolidated-surface -->

> **Tool surface (v4).** The operations below are exposed as the following tools; pass the operation as `method`. Groups not in the core set appear after `scf_load_tools`. Full mapping: [`migration-consolidation.md`](../migration-consolidation.md).
>
> - `scf_document_read` (load `documents`): `list` = `scf_list_documents`, `get` = `scf_get_document`, `export` = `scf_export_document`, `preview` = `scf_preview_document`, `history` = `scf_get_document_history`, `section_generated` = `scf_get_document_section_generated`, `generation_status` = `scf_get_document_generation_status`, `settings` = `scf_get_document_settings`, `domains` = `scf_list_document_domains`, `generators` = `scf_list_document_generators`
> - `scf_document_profile_read` (load `documents`): `scopes` = `scf_list_document_scopes`, `map` = `scf_get_document_map`, `profile_preview` = `scf_preview_document_profile`, `isms_profile` = `scf_get_isms_profile`
> - `scf_document_write` (load `documents`): `generate` = `scf_generate_documents`, `transition` = `scf_transition_document`, `update_section` = `scf_update_document_section`, `resolve_section` = `scf_resolve_document_section`, `update_settings` = `scf_update_document_settings`, `update_isms_profile` = `scf_update_isms_profile_section`

---

## `scf_list_document_generators`

List the ISMS document generators available to this organization (read — viewer role): generator name, document type, tier, derivative flag. Call before scf_generate_documents.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_list_document_domains`

List the SCF domains this organization can currently generate documents for (read — viewer role). A domain appears only when it has enough scoped controls to produce a document.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_get_document_settings`

Get the organization's document-generation settings (read — viewer role): doc-gen and derivative switches, SCF licence acknowledgement state, the current document_profile and the profiles on offer.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_update_document_settings`

Enable or configure document generation (write — admin role). Generation stays blocked until the SCF licence is acknowledged, so the first call usually sets both enabled and acknowledge_licence.

| Parameter                       | Type    | Required | Description                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`                        | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                                                                                             |
| `enabled`                       | boolean | No       | Turn document generation on or off for this organization                                                                                                                                                                                                                           |
| `derivative_generators_enabled` | boolean | No       | Allow generators that derive content from other generated documents                                                                                                                                                                                                                |
| `acknowledge_licence`           | boolean | No       | Record acknowledgement of the SCF content licence — required once before generation is permitted                                                                                                                                                                                   |
| `document_profile`              | string  | No       | Document structure to switch to (how controls are grouped into policies, standards and procedures). The current one is in scf_get_document_settings; an unknown name is refused (400) with the valid names. A switch supersedes documents: call scf_preview_document_profile first |

---

## `scf_generate_documents`

Queue ISMS document generation for one or more generators (write — admin role). Returns a task_id; poll scf_get_document_generation_status. Existing documents are skipped unless force is set.

| Parameter  | Type    | Required | Description                                                                                  |
| ---------- | ------- | -------- | -------------------------------------------------------------------------------------------- |
| `org_id`   | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                       |
| `requests` | array   | Yes      | Between 1 and 40 generation requests to queue in this batch                                  |
| `force`    | boolean | No       | Regenerate even when a document already exists for that generator and domain (default false) |

Each request is `{generator, domain_id?}`. The `governance-report` generator produces the Governance Oversight Report: the figures a board needs to exercise due care (implementation and known deficiencies, change in the risk profile, what validation found and corrected, the obligations in scope, and red flags). It is not domain-scoped, and approving it records the board's review.

---

## `scf_get_document_generation_status`

Poll this organization's in-flight document generation (read — viewer role). Returns {status: 'idle'} when nothing is running. Call after scf_generate_documents until it completes.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_list_documents`

List generated ISMS documents (read — viewer role): lifecycle status, section counts, unresolved conflicts, pending retirements, and whether the document is stale against current org inputs.

| Parameter       | Type   | Required | Description                                                        |
| --------------- | ------ | -------- | ------------------------------------------------------------------ |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations             |
| `status`        | string | No       | Filter by lifecycle status (e.g. 'draft', 'approved', 'published') |
| `document_type` | string | No       | Filter by document type (e.g. 'policy', 'procedure')               |

---

## `scf_get_document`

Get one generated document in full (read — viewer role): metadata plus every section with its merge state — clean, edited, conflicted or pending retirement. Use this to read a document.

| Parameter     | Type   | Required | Description                                              |
| ------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents |

---

## `scf_update_document_section`

Replace one section's content with a human edit (write — editor role). Tracked as a human layer, so a later regeneration reports a conflict instead of overwriting it silently.

| Parameter     | Type   | Required | Description                                                                                                                   |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                        |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents                                                                      |
| `section_id`  | string | Yes      | Section identifier from the document detail (scf_get_document). May contain slashes — pass it exactly as returned, unescaped. |
| `content`     | string | Yes      | Full replacement markdown body for this section                                                                               |

---

## `scf_get_document_section_generated`

Get the generator's own version of a section, ignoring any human edit (read — viewer role). Use it to see what the platform would produce before resolving a conflict.

| Parameter     | Type   | Required | Description                                                                                                                   |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                        |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents                                                                      |
| `section_id`  | string | Yes      | Section identifier from the document detail (scf_get_document). May contain slashes — pass it exactly as returned, unescaped. |
| `version`     | number | No       | Generation version number to read; omit for the latest                                                                        |

---

## `scf_resolve_document_section`

Resolve one section's merge state (write — editor role). keep_mine/take_generated settle a conflict; retire/keep dispose of a pending retirement. The wrong pair for the state returns 409.

| Parameter     | Type   | Required | Description                                                                                                                   |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                        |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents                                                                      |
| `section_id`  | string | Yes      | Section identifier from the document detail (scf_get_document). May contain slashes — pass it exactly as returned, unescaped. |
| `choice`      | enum   | Yes      | keep_mine / take_generated answer a conflict; retire / keep answer a pending retirement                                       |

---

## `scf_transition_document`

Move a document through its lifecycle — draft to review, review to approved, approved to published (write — approving and publishing need admin). Valid targets are enforced by the platform.

| Parameter     | Type   | Required | Description                                                         |
| ------------- | ------ | -------- | ------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations              |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents            |
| `to_status`   | string | Yes      | Target lifecycle status (e.g. 'in_review', 'approved', 'published') |
| `reason`      | string | No       | Free-text justification recorded on the transition                  |

---

## `scf_get_document_history`

Get a document's version and transition history (read — viewer role): who moved it between lifecycle states, when, why, and what each generation version changed.

| Parameter     | Type   | Required | Description                                              |
| ------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents |

---

## `scf_export_document`

Export a document as rendered markdown or HTML text (read — viewer role). The platform also renders PDF, but that is a binary download and is not offered here — fetch it from the web UI instead.

| Parameter     | Type   | Required | Description                                                |
| ------------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations     |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents   |
| `format`      | enum   | No       | Export format: 'md' for markdown, 'html' for rendered HTML |

---

## `scf_preview_document`

Preview a document's assembled content as structured JSON (read — viewer role) — the merged result of generated and edited sections without rendering to a file.

| Parameter     | Type   | Required | Description                                              |
| ------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `document_id` | string | Yes      | Generated document UUID — obtain from scf_list_documents |

---

## `scf_list_document_scopes`

What each generator can produce under the organization's document profile (read — viewer role): only scopes with at least one in-scope control, each with its control count.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_get_document_map`

Which document each in-scope control lands in (read — viewer role): per control, its policy, standard and procedure under the organization's document profile.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_preview_document_profile`

What switching to another document profile would supersede, create and keep (read — viewer role). Changes nothing; call before scf_update_document_settings(document_profile).

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `profile` | string | Yes      | The document profile to preview switching to           |

---

## `scf_get_isms_profile`

The organization's ISMS profile (read — viewer): scope statement, context issues, interested parties, communication plan, audit programme, and objectives (read-only here).

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

The objectives in the profile cannot be changed through `scf_update_isms_profile_section`. Security objectives have their own tools: see [objectives.md](objectives.md).

---

## `scf_update_isms_profile_section`

Save one ISMS profile section (write — editor). data REPLACES the whole section: read it with scf_get_isms_profile, change it and send it all back, keeping row ids. Audited.

| Parameter | Type            | Required | Description                                                                                                                                                                            |
| --------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`  | string          | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                 |
| `section` | enum            | Yes      | Section to save: scope, context_issues, interested_parties, communication_plan, audit_programme                                                                                        |
| `data`    | object \| array | Yes      | The section's whole value, in the shape scf_get_isms_profile returns it: an object for scope, a list of rows (at most 200) for every other section. A row without an id gets a new one |

The tool refuses a list for `scope`, and anything but a list for the other sections, before the call reaches the platform: the platform reads an empty list for `scope` as an empty object and would blank the scope.

---
