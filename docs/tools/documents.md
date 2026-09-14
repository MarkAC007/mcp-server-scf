# Document tools

Generate, edit and publish ISMS documents from the organization's scoped controls.

A generator produces a document as a set of sections. A human may edit any section, and
that edit is tracked as its own layer — so when the generator runs again the platform
reports a **conflict** rather than overwriting the edit, or marks a section
**pending retirement** when the generator no longer produces it. Nothing regenerates by
itself; a document that has drifted from current org inputs is flagged `is_stale` and
left alone.

The 15 tools split into five concerns:

1. **Discovery** — `scf_list_document_generators`, `scf_list_document_domains`
2. **Configuration** — `scf_get_document_settings`, `scf_update_document_settings`
3. **Generation** — `scf_generate_documents`, `scf_get_document_generation_status`
4. **Reading and editing** — `scf_list_documents`, `scf_get_document`, `scf_update_document_section`, `scf_get_document_section_generated`, `scf_resolve_document_section`
5. **Lifecycle and output** — `scf_transition_document`, `scf_get_document_history`, `scf_export_document`, `scf_preview_document`

> **Licence gate:** generation stays blocked until the SCF content licence is acknowledged
> via `scf_update_document_settings` with `acknowledge_licence: true`.

> **PDF export is not exposed.** The platform renders PDF, but a binary is the wrong
> payload for a stdio tool result — `scf_export_document` offers `md` and `html`.

Source: [`src/tools/documents.ts`](../../src/tools/documents.ts).

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

Get the organization's document-generation settings (read — viewer role): whether doc-gen is enabled, whether derivative generators are enabled, and the SCF licence acknowledgement state.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_update_document_settings`

Enable or configure document generation (write — admin role). Generation stays blocked until the SCF licence is acknowledged, so the first call usually sets both enabled and acknowledge_licence.

| Parameter                       | Type    | Required | Description                                                                                      |
| ------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------ |
| `org_id`                        | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                           |
| `enabled`                       | boolean | No       | Turn document generation on or off for this organization                                         |
| `derivative_generators_enabled` | boolean | No       | Allow generators that derive content from other generated documents                              |
| `acknowledge_licence`           | boolean | No       | Record acknowledgement of the SCF content licence — required once before generation is permitted |

---

## `scf_generate_documents`

Queue ISMS document generation for one or more generators (write — admin role). Returns a task_id; poll scf_get_document_generation_status. Existing documents are skipped unless force is set.

| Parameter  | Type    | Required | Description                                                                                  |
| ---------- | ------- | -------- | -------------------------------------------------------------------------------------------- |
| `org_id`   | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                       |
| `requests` | array   | Yes      | Between 1 and 40 generation requests to queue in this batch                                  |
| `force`    | boolean | No       | Regenerate even when a document already exists for that generator and domain (default false) |

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
