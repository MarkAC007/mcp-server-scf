# CDM tools

Compliance Document Mapping — connect the organization's own policy corpus to its controls.

The platform ingests documents, classifies their intent, and proposes which of them
evidence which controls. Each proposal is a control-level card with the document passages
(citations) that support it; accepting or dismissing the card carries its citations with it.

The 7 tools split into three concerns:

1. **Coverage** — `scf_get_cdm_document_map`, `scf_list_cdm_documents`
2. **Review queue** — `scf_list_cdm_proposals`, `scf_accept_cdm_proposal`, `scf_dismiss_cdm_proposal`, `scf_list_cdm_mappings`
3. **Search** — `scf_query_cdm_corpus`

> **Ingestion is not exposed here.** Document upload, reingestion and chunk backfill are
> multipart or long-running maintenance operations — do those in the web UI.

Source: [`src/tools/cdm.ts`](../../src/tools/cdm.ts).

---

## `scf_get_cdm_document_map`

Get the CDM document map (read — viewer role): per-domain coverage showing which ingested documents speak to which SCF domains, and where the corpus is silent. Finds documentation gaps.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_list_cdm_documents`

List the documents ingested into the organization's CDM corpus (read — viewer role), with their ingestion state.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `limit`   | number | No       | Page size, 1–200 (default 50)                          |
| `offset`  | number | No       | Rows to skip for pagination (default 0)                |

---

## `scf_list_cdm_proposals`

List control-level CDM proposals with nested citations (read — viewer role), highest consolidated score first. The review queue: 'this document evidences this control, here is where'.

| Parameter     | Type   | Required | Description                                                          |
| ------------- | ------ | -------- | -------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations               |
| `control_id`  | string | No       | Filter to one scoped control by its UUID                             |
| `document_id` | string | No       | Filter to proposals from one CDM document                            |
| `status`      | string | No       | Filter by proposal status (e.g. 'proposed', 'accepted', 'dismissed') |
| `limit`       | number | No       | Page size, 1–200 (default 50)                                        |
| `offset`      | number | No       | Rows to skip for pagination (default 0)                              |

---

## `scf_accept_cdm_proposal`

Accept a control-level CDM proposal (write — editor role). One decision covers the whole card: the proposal and every citation under it flip to accepted together.

| Parameter     | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations |
| `proposal_id` | string | Yes      | Proposal UUID — obtain from scf_list_cdm_proposals     |

---

## `scf_dismiss_cdm_proposal`

Dismiss a control-level CDM proposal (write — editor role). The proposal and its citations are dismissed together, and the reason — if given — is stored on each.

| Parameter     | Type   | Required | Description                                                                 |
| ------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization UUID — obtain from scf_list_organizations                      |
| `proposal_id` | string | Yes      | Proposal UUID — obtain from scf_list_cdm_proposals                          |
| `reason`      | string | No       | Why this proposal was rejected — recorded on the proposal and its citations |

---

## `scf_list_cdm_mappings`

List CDM citation-level mappings (read — viewer role): the document passages proposed as evidence for a control, each lifecycle-badged. Use scf_list_cdm_proposals for the per-control view.

| Parameter    | Type   | Required | Description                                                         |
| ------------ | ------ | -------- | ------------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization UUID — obtain from scf_list_organizations              |
| `control_id` | string | No       | Filter to one scoped control by its UUID                            |
| `status`     | string | No       | Filter by mapping status (e.g. 'proposed', 'accepted', 'dismissed') |
| `limit`      | number | No       | Page size, 1–200 (default 50)                                       |
| `offset`     | number | No       | Rows to skip for pagination (default 0)                             |

---

## `scf_query_cdm_corpus`

Search the organization's ingested policy corpus for passages relevant to one scoped control (read — viewer role). Ranked hits with source documents: 'what do our own documents say?'

| Parameter    | Type   | Required | Description                                                                  |
| ------------ | ------ | -------- | ---------------------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization UUID — obtain from scf_list_organizations                       |
| `control_id` | string | Yes      | Scoped control UUID to search against — obtain from scf_list_scoped_controls |
| `query_text` | string | No       | Extra search text to bias the results; omit to use the control's own wording |
| `limit`      | number | No       | Maximum hits to return, 1–200 (default 10)                                   |

---
