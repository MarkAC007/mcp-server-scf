# Audit engagement tools

Run an external audit against a frozen scope.

Creating an engagement materialises the in-scope controls for its frameworks and freezes
them against the catalog version current at that moment. That freeze is the point: the
scope keeps rendering after controls are deprecated by a later SCF release, with each row
carrying a lifecycle badge, so an audit that ran under SCF 2025.1 still reads as it did.

Auditors are granted access **per engagement**, not per organization — the grant exposes
that engagement's frozen scope, its queries and its evidence review board, and nothing
else. A grant goes to one of the organization's external auditors by `org_auditor_id`
(`scf_list_org_auditors` lists them) or to a user by `user_id`; an organization member is
granted with `kind: internal`.

A query is raised on one control or one evidence object. The evidence review board, where
an auditor works through evidence objects, is a separate on-demand group: see
[engagement-reviews.md](engagement-reviews.md).

The 17 tools split into four concerns:

1. **Engagement CRUD** — `scf_list_engagements`, `scf_get_engagement`, `scf_create_engagement`, `scf_update_engagement`, `scf_delete_engagement`
2. **Scope views** — `scf_get_engagement_scope`, `scf_get_engagement_presentation`
3. **Auditor access** — `scf_list_engagement_auditors`, `scf_add_engagement_auditor`, `scf_remove_engagement_auditor`, `scf_list_my_engagements`, `scf_list_org_auditors`
4. **Structured queries** — `scf_list_engagement_queries`, `scf_get_engagement_query`, `scf_create_engagement_query`, `scf_respond_to_engagement_query`, `scf_update_engagement_query_status`

Source: [`src/tools/engagements.ts`](../../src/tools/engagements.ts).

<!-- consolidated-surface -->

> **Tool surface (v4).** The operations below are exposed as the following tools; pass the operation as `method`. Groups not in the core set appear after `scf_load_tools`. Full mapping: [`migration-consolidation.md`](../migration-consolidation.md).
>
> - `scf_engagement_read` (load `engagements`): `list` = `scf_list_engagements`, `get` = `scf_get_engagement`, `mine` = `scf_list_my_engagements`, `scope` = `scf_get_engagement_scope`, `presentation` = `scf_get_engagement_presentation`, `auditors` = `scf_list_engagement_auditors`, `org_auditors` = `scf_list_org_auditors`, `queries` = `scf_list_engagement_queries`, `query` = `scf_get_engagement_query`
> - `scf_engagement_write` (load `engagements`): `create` = `scf_create_engagement`, `update` = `scf_update_engagement`, `delete` = `scf_delete_engagement`, `add_auditor` = `scf_add_engagement_auditor`, `remove_auditor` = `scf_remove_engagement_auditor`, `create_query` = `scf_create_engagement_query`, `update_query_status` = `scf_update_engagement_query_status`, `respond_to_query` = `scf_respond_to_engagement_query`

---

## `scf_list_engagements`

List the organization's audit engagements (read — viewer role). Each entry carries its frameworks, status, dates and the catalog version its scope was frozen against.

| Parameter | Type   | Required | Description                                                        |
| --------- | ------ | -------- | ------------------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations             |
| `status`  | enum   | No       | Filter by engagement status: draft, active, under_review or closed |

---

## `scf_get_engagement`

Get one audit engagement's detail (read — viewer role, or an auditor assigned to this engagement).

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |

---

## `scf_create_engagement`

Create an audit engagement in draft (write — editor role). Freezes the in-scope controls for the named frameworks against the current catalog version, so the scope renders after deprecations.

| Parameter    | Type   | Required | Description                                                      |
| ------------ | ------ | -------- | ---------------------------------------------------------------- |
| `org_id`     | string | Yes      | Organization UUID — obtain from scf_list_organizations           |
| `name`       | string | Yes      | Engagement name, e.g. a framework and audit period               |
| `frameworks` | array  | Yes      | Framework identifiers in scope — obtain from scf_list_frameworks |
| `start_date` | string | No       | Fieldwork start date, ISO 8601 (YYYY-MM-DD)                      |
| `end_date`   | string | No       | Fieldwork end date, ISO 8601 (YYYY-MM-DD)                        |

---

## `scf_update_engagement`

Update an engagement's name, frameworks, status or dates (write — editor role). Only passed fields change; status moves are caller-controlled: draft → active → under_review → closed.

| Parameter       | Type   | Required | Description                                                  |
| --------------- | ------ | -------- | ------------------------------------------------------------ |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations       |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements     |
| `name`          | string | No       | New engagement name                                          |
| `frameworks`    | array  | No       | Replacement framework identifier list                        |
| `status`        | enum   | No       | New engagement status: draft, active, under_review or closed |
| `start_date`    | string | No       | Fieldwork start date, ISO 8601 (YYYY-MM-DD)                  |
| `end_date`      | string | No       | Fieldwork end date, ISO 8601 (YYYY-MM-DD)                    |

---

## `scf_delete_engagement`

Delete a draft audit engagement and its frozen scope (destructive write — admin role). Non-draft engagements are refused with 409 — close them instead. Auditor grants are revoked with it.

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |

---

## `scf_get_engagement_scope`

Get an engagement's frozen control scope (read — viewer role, or an assigned auditor). Rows carry a catalog lifecycle badge, so controls deprecated since the freeze still render, marked.

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |

---

## `scf_get_engagement_presentation`

Get the engagement's scope presented natively in one of its frameworks (read — viewer, or assigned auditor): SCF controls organised by that framework's own structure, as an auditor reads them.

| Parameter       | Type   | Required | Description                                                                |
| --------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                     |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                   |
| `framework`     | string | Yes      | Framework to present from — must be one of the engagement's own frameworks |

---

## `scf_list_my_engagements`

List engagements the caller holds an active auditor grant on, across organizations (read). The auditor's own view — use scf_list_engagements for the organization-side list.

_No parameters._

---

## `scf_list_engagement_auditors`

List the auditors granted read access to one engagement (read — viewer role). Each grant carries its status: invited, active or revoked.

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |

---

## `scf_list_org_auditors`

List the organization's external auditors (read — viewer): the source of org_auditor_id for scf_add_engagement_auditor. Inviting or changing an auditor is done in the platform UI.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

---

## `scf_add_engagement_auditor`

Grant read access to one engagement (write — admin): an external auditor by org_auditor_id, or a user by user_id (an organization member needs kind internal). Exactly one id; a re-grant reactivates.

| Parameter        | Type   | Required | Description                                                                                                                                                                                                   |
| ---------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`         | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                        |
| `engagement_id`  | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                                                                                                                      |
| `user_id`        | string | No       | UUID of an existing user. An organization member (scf_list_members) must be granted with kind internal: the platform refuses a member as external (422)                                                       |
| `org_auditor_id` | string | No       | UUID of one of the organization's external auditors — obtain from scf_list_org_auditors. Not the engagement auditor record id that scf_remove_engagement_auditor takes                                        |
| `kind`           | enum   | No       | external (default) or internal (an organization member acting as auditor; user_id only, and required for a member). An internal auditor cannot accept evidence they own, are accountable for, or responded on |

Pass exactly one of `user_id` or `org_auditor_id`. The tool refuses a call with both or neither, or `org_auditor_id` with `kind: internal`, before it reaches the platform. `org_auditor_id` is sent to the platform as `auditor_id`.

---

## `scf_remove_engagement_auditor`

Revoke an auditor's access to one engagement (destructive write — admin role). Returns no content on success.

| Parameter       | Type   | Required | Description                                                                                                   |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                        |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                      |
| `auditor_id`    | string | Yes      | Engagement auditor record UUID (the grant, not the org_auditor_id) — obtain from scf_list_engagement_auditors |

---

## `scf_list_engagement_queries`

List an engagement's auditor queries (read — viewer role, or an assigned auditor). A query is a question against one control or one evidence object, with its responses and status.

| Parameter       | Type   | Required | Description                                                                               |
| --------------- | ------ | -------- | ----------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                    |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                  |
| `scf_id`        | string | No       | Filter to a single SCF control in DOMAIN-NN format — obtain from scf_get_engagement_scope |
| `evidence_id`   | string | No       | Filter to queries raised on one evidence object (SCF ERL id, e.g. 'E-GOV-01')             |
| `status`        | enum   | No       | Filter by query status: open, answered or closed                                          |

---

## `scf_get_engagement_query`

Get one auditor query with its full response thread (read — viewer role, or an assigned auditor).

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |
| `query_id`      | string | Yes      | Query UUID — obtain from scf_list_engagement_queries     |

---

## `scf_create_engagement_query`

Raise a query on one control or one evidence object of the engagement (write — org member or assigned auditor): exactly one of scf_id or evidence_id. Never moves an evidence review card.

| Parameter       | Type   | Required | Description                                                                                                                                                                    |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                         |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                                                                                       |
| `scf_id`        | string | No       | SCF control the query is about, in DOMAIN-NN format — must be in scope, see scf_get_engagement_scope                                                                           |
| `evidence_id`   | string | No       | Evidence object the query is about (SCF ERL id, e.g. 'E-GOV-01') — must be on the engagement's review board, see scf_list_evidence_reviews (load the engagement-reviews group) |
| `title`         | string | Yes      | Short summary of what is being asked                                                                                                                                           |
| `body`          | string | Yes      | Full text of the query                                                                                                                                                         |

Pass exactly one of `scf_id` or `evidence_id`. The tool refuses a call with both or neither before it reaches the platform.

---

## `scf_respond_to_engagement_query`

Add a response to an auditor query (write — org member or assigned auditor). Posting a response moves an open query to answered. Returns the updated query with its full thread.

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |
| `query_id`      | string | Yes      | Query UUID — obtain from scf_list_engagement_queries     |
| `content`       | string | Yes      | Response text                                            |

---

## `scf_update_engagement_query_status`

Move an auditor query through its lifecycle (write — org member or assigned auditor). Allowed: open → answered|closed, answered → open|closed, closed → open. Others are refused.

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |
| `query_id`      | string | Yes      | Query UUID — obtain from scf_list_engagement_queries     |
| `status`        | enum   | Yes      | Target query status                                      |

---
