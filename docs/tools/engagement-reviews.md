# Engagement Evidence Review tools

The evidence review board is where an auditor works through an engagement's evidence. A card is one evidence object (SCF ERL id, e.g. `E-GOV-01`) mapped to the engagement's in-scope controls and, through them, to the clauses of one of the engagement's frameworks. The board's columns are review stages: `open`, `in_progress`, `action_required`, `submitted`, `accepted`.

**This group is loaded on demand.** Call `scf_load_tools` with `groups: ["engagement-reviews"]` first. The engagements themselves, their auditors and their queries are in the `engagements` group: see [engagements.md](engagements.md).

Properties worth knowing before calling any of these:

- **Who may read.** Every read takes an organization member or an active auditor on the engagement.
- **One framework at a time.** The board, a card, a status move, a reviewer assignment and the dashboard take `framework`, one of the engagement's frameworks (see `scf_get_engagement`). When it is omitted, the engagement's first framework is used.
- **Moves are checked.** A card's `allowed_transitions` lists what the caller may do now. A move that is not in the table is refused (409), a move by the wrong side is refused (403), and a move without its note or artifact is refused (422). Pass `from_status` with the status you last read and the move is refused (409) if the card has moved since.
- **Two comment threads.** `shared` is seen by everyone with engagement access. `internal` is for organization members only: an auditor cannot read it (404) or post to it (403), and a reply takes its parent's visibility.
- **Queries do not move cards.** A query on an evidence object is raised with `scf_create_engagement_query` (`evidence_id`) in the `engagements` group, and it never moves the card.

Source: [`src/tools/engagement-reviews.ts`](../../src/tools/engagement-reviews.ts). Shapes mirror the platform's `backend/api/engagement_evidence_reviews.py` and `engagement_comments.py`.

<!-- consolidated-surface -->

> **Tool surface (v4).** The operations below are exposed as the following tools; pass the operation as `method`. This group is not in the core set: call `scf_load_tools` with `engagement-reviews` first. Full mapping: [`migration-consolidation.md`](../migration-consolidation.md).
>
> - `scf_evidence_review_read` (load `engagement-reviews`): `board` = `scf_list_evidence_reviews`, `card` = `scf_get_evidence_review`, `events` = `scf_list_evidence_review_events`, `people` = `scf_list_review_people`, `dashboard` = `scf_get_review_dashboard`, `comments` = `scf_list_evidence_review_comments`, `comment_counts` = `scf_count_evidence_review_comments`
> - `scf_evidence_review_write` (load `engagement-reviews`): `set_status` = `scf_set_evidence_review_status`, `assign_reviewer` = `scf_assign_evidence_reviewer`, `comment` = `scf_create_evidence_review_comment`

The 10 tools split into four concerns:

1. **Reading the board** — `scf_list_evidence_reviews`, `scf_get_evidence_review`, `scf_list_evidence_review_events`, `scf_get_review_dashboard`
2. **Moving cards** — `scf_set_evidence_review_status`
3. **Reviewers and people** — `scf_list_review_people`, `scf_assign_evidence_reviewer`
4. **Comments** — `scf_list_evidence_review_comments`, `scf_count_evidence_review_comments`, `scf_create_evidence_review_comment`

## Status moves

Taken from the `to_status` parameter of `scf_set_evidence_review_status`. Any other move is refused (409); a listed move made by the wrong side is refused (403), and one without what it also needs is refused (422).

| From              | To                | Who                          | Also needs                                               |
| ----------------- | ----------------- | ---------------------------- | -------------------------------------------------------- |
| `open`            | `in_progress`     | Auditor                      |                                                          |
| `in_progress`     | `action_required` | Auditor                      | `note`                                                   |
| `in_progress`     | `accepted`        | Auditor                      |                                                          |
| `action_required` | `submitted`       | Organization editor or admin | `note`, plus `artifact_file_ids` or `no_artifact_reason` |
| `submitted`       | `in_progress`     | Auditor                      |                                                          |
| `submitted`       | `action_required` | Auditor                      | `note`                                                   |
| `submitted`       | `accepted`        | Auditor                      |                                                          |
| `accepted`        | `in_progress`     | Auditor                      | `note`                                                   |

An internal auditor cannot accept evidence they own, are accountable for, or responded on (403). An internal auditor is an organization member granted access with `kind: internal` through `scf_add_engagement_auditor`.

## Not wrapped

Editing or deleting a comment, and the signed download link for a card's artifact, are not wrapped. `scf_create_evidence_review_comment` only posts. The verdicts are in [`../tool-scope.md`](../tool-scope.md).

---

## `scf_list_evidence_reviews`

The evidence review board for one framework of an engagement (read — org member or active auditor): cards with status, AI verdict and allowed moves, controls with no evidence, filter options.

| Parameter          | Type    | Required | Description                                                                                                     |
| ------------------ | ------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `org_id`           | string  | Yes      | Organization UUID — obtain from scf_list_organizations                                                          |
| `engagement_id`    | string  | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                        |
| `framework`        | string  | No       | One of the engagement's frameworks (see scf_get_engagement); the engagement's first framework when omitted      |
| `status`           | enum    | No       | Filter by review status. One of `open`, `in_progress`, `action_required`, `submitted`, `accepted`               |
| `clause`           | string  | No       | Filter to one clause of the framework, as the board's filter options list it                                    |
| `scf_id`           | string  | No       | Filter to cards mapped to one SCF control (DOMAIN-NN)                                                           |
| `ai_verdict`       | enum    | No       | Filter by the card's worst in-window AI verdict. One of `sufficient`, `partial`, `insufficient`, `not_assessed` |
| `has_open_queries` | boolean | No       | true = only cards with an open query; false = only cards without                                                |
| `reviewer`         | string  | No       | Reviewer user UUID (obtain from scf_list_review_people), or 'none' for unassigned cards                         |
| `search`           | string  | No       | Free-text match on the card                                                                                     |
| `mine`             | boolean | No       | true = only cards assigned to the caller                                                                        |

---

## `scf_get_evidence_review`

One evidence review card (read — org member or active auditor): artifacts, the last decision, the catalog text, mapped controls and clauses, and allowed_transitions for the caller.

| Parameter       | Type   | Required | Description                                                                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                     |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                   |
| `evidence_id`   | string | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews      |
| `framework`     | string | No       | One of the engagement's frameworks (see scf_get_engagement); the engagement's first framework when omitted |

---

## `scf_list_evidence_review_events`

The history of one evidence review card, oldest first (read — org member or active auditor): each status move and reviewer assignment with who made it, when, and the note.

| Parameter       | Type   | Required | Description                                                                                           |
| --------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                              |
| `evidence_id`   | string | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews |

---

## `scf_list_review_people`

People with access to one engagement (read — org member or active auditor), without emails: auditors and members. The source of user ids for reviewer assignment, filters and mentions.

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations   |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements |

---

## `scf_get_review_dashboard`

Roll-up of the evidence review for one framework (read — org member or active auditor): evidence, controls and clauses by review status, action required, open queries, timeline.

| Parameter       | Type   | Required | Description                                                                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                     |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                   |
| `framework`     | string | No       | One of the engagement's frameworks (see scf_get_engagement); the engagement's first framework when omitted |

---

## `scf_set_evidence_review_status`

Move an evidence review card (write). Auditors make every move except action_required→submitted, which an organization editor or admin makes. Unlisted move 409, wrong side 403, missing note 422.

| Parameter            | Type     | Required | Description                                                                                                                                                                                              |
| -------------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`             | string   | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                                                                   |
| `engagement_id`      | string   | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                                                                                                                 |
| `evidence_id`        | string   | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews                                                                                                    |
| `framework`          | string   | No       | One of the engagement's frameworks (see scf_get_engagement); the engagement's first framework when omitted                                                                                               |
| `to_status`          | enum     | Yes      | Status to move the card to; the card's allowed_transitions lists what the caller may do now. See [Status moves](#status-moves). One of `open`, `in_progress`, `action_required`, `submitted`, `accepted` |
| `from_status`        | enum     | No       | The status you last read; when given, the move is refused (409) if the card has moved since                                                                                                              |
| `note`               | string   | No       | Why: what action is needed (to action_required), the organization's response (to submitted), or the reason for reopening accepted evidence                                                               |
| `artifact_file_ids`  | string[] | No       | For action_required→submitted: evidence file UUIDs of this evidence object that answer the request — obtain from scf_list_evidence_files                                                                 |
| `no_artifact_reason` | string   | No       | For action_required→submitted with no file to link: why there is none                                                                                                                                    |

---

## `scf_assign_evidence_reviewer`

Assign, or clear, the auditor reviewing one evidence card (write — an engagement auditor or an organization admin). The reviewer must hold an active auditor grant on this engagement.

| Parameter       | Type           | Required | Description                                                                                                |
| --------------- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `org_id`        | string         | Yes      | Organization UUID — obtain from scf_list_organizations                                                     |
| `engagement_id` | string         | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                   |
| `evidence_id`   | string         | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews      |
| `framework`     | string         | No       | One of the engagement's frameworks (see scf_get_engagement); the engagement's first framework when omitted |
| `user_id`       | string \| null | Yes      | Auditor user UUID — obtain from scf_list_review_people; null clears the assignment                         |

---

## `scf_list_evidence_review_comments`

The comment thread on one evidence review card, oldest first (read — org member or active auditor). shared is seen by all with engagement access; an auditor asking for internal gets 404.

| Parameter       | Type   | Required | Description                                                                                           |
| --------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                              |
| `evidence_id`   | string | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews |
| `visibility`    | enum   | No       | Which thread: shared (default) or internal (organization members only). One of `shared`, `internal`   |

---

## `scf_count_evidence_review_comments`

Comment counts for one evidence review card (read — org member or active auditor): {shared: n}, plus internal only for a caller who may see internal notes (absent for an auditor).

| Parameter       | Type   | Required | Description                                                                                           |
| --------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                |
| `engagement_id` | string | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                              |
| `evidence_id`   | string | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews |

---

## `scf_create_evidence_review_comment`

Post a comment on one evidence review card (write — org member or active auditor). A reply takes its parent's visibility; an auditor cannot post internal notes. No edit or delete here.

| Parameter           | Type     | Required | Description                                                                                                            |
| ------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `org_id`            | string   | Yes      | Organization UUID — obtain from scf_list_organizations                                                                 |
| `engagement_id`     | string   | Yes      | Audit engagement UUID — obtain from scf_list_engagements                                                               |
| `evidence_id`       | string   | Yes      | Evidence object id on the board (SCF ERL id, e.g. 'E-GOV-01') — obtain from scf_list_evidence_reviews                  |
| `content`           | string   | Yes      | Comment text                                                                                                           |
| `visibility`        | enum     | No       | shared (default: everyone with engagement access) or internal (organization members only). One of `shared`, `internal` |
| `parent_comment_id` | string   | No       | Comment UUID to reply to — obtain from scf_list_evidence_review_comments                                               |
| `mentions`          | string[] | No       | User UUIDs to notify — obtain from scf_list_review_people                                                              |

---

## Example prompts

- "Show the ISO 27001 evidence review board for our current audit engagement, only cards that need action."
- "What has happened on card `E-GOV-01` so far?"
- "Mark `E-GOV-01` as submitted with the new access review export, and explain what changed."
- "Assign the unassigned cards on the board to our lead auditor."
