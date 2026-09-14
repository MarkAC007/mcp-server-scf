# Collaboration tools

Per-user assignments and comment threads on controls, evidence items and tasks. These are the individual counterpart to the team accountability layer in [`teams.md`](./teams.md): a team owns the item, a person works it. None of these paths take an `org_id` — the platform scopes them to the API key's organization.

Source: [`src/tools/collaboration.ts`](../../src/tools/collaboration.ts).

The 7 tools split into two concerns:

1. **Assignments** — `scf_list_assignments`, `scf_create_assignment`, `scf_delete_assignment`
2. **Comments** — `scf_list_comments`, `scf_create_comment`

---

## `scf_list_assignments`

List user assignments to controls, evidence items or tasks (read). Filter by item type and id, or by user_id to see one person's workload.

| Parameter         | Type   | Required | Description                                 |
| ----------------- | ------ | -------- | ------------------------------------------- |
| `assignable_type` | string | No       | `control`, `evidence`, or `task`            |
| `assignable_id`   | string | No       | Item UUID                                   |
| `user_id`         | string | No       | Assignee UUID — get from `scf_list_members` |

---

## `scf_create_assignment`

Assign a user to a control, evidence item or task as primary or collaborator (write — editor role). Use scf_batch_update_evidence for evidence owners in bulk.

| Parameter         | Type   | Required | Description                                    |
| ----------------- | ------ | -------- | ---------------------------------------------- |
| `assignable_type` | string | Yes      | `control`, `evidence`, or `task`               |
| `assignable_id`   | string | Yes      | Scoped control, evidence tracking or task UUID |
| `user_id`         | string | Yes      | Assignee UUID — get from `scf_list_members`    |
| `role`            | string | No       | `primary` (default) or `collaborator`          |

---

## `scf_delete_assignment`

Remove a user assignment (destructive write — editor role).

| Parameter       | Type   | Required | Description                                   |
| --------------- | ------ | -------- | --------------------------------------------- |
| `assignment_id` | string | Yes      | Assignment UUID — from `scf_list_assignments` |

---

## `scf_list_comments`

List the comment thread on one control, evidence item or task (read — viewer role), oldest first, with authors, mentions and reply structure.

| Parameter          | Type   | Required | Description                                    |
| ------------------ | ------ | -------- | ---------------------------------------------- |
| `commentable_type` | string | Yes      | `control`, `evidence`, or `task`               |
| `commentable_id`   | string | Yes      | Scoped control, evidence tracking or task UUID |

---

## `scf_create_comment`

Post a comment on a control, evidence item or task (write — any member). Mention users by UUID to notify them; set parent_comment_id to reply in a thread.

| Parameter           | Type     | Required | Description                                    |
| ------------------- | -------- | -------- | ---------------------------------------------- |
| `commentable_type`  | string   | Yes      | `control`, `evidence`, or `task`               |
| `commentable_id`    | string   | Yes      | Scoped control, evidence tracking or task UUID |
| `content`           | string   | Yes      | Comment body                                   |
| `mentions`          | string[] | No       | User UUIDs to notify                           |
| `parent_comment_id` | string   | No       | Reply to this comment                          |

---

## `scf_update_comment`

Edit a comment you authored (write — author only). Replaces the body and, if given, the mentions; the platform keeps the edit history.

| Parameter    | Type     | Required | Description                                    |
| ------------ | -------- | -------- | ---------------------------------------------- |
| `comment_id` | string   | yes      | Comment UUID — obtain from `scf_list_comments` |
| `content`    | string   | yes      | New comment body                               |
| `mentions`   | string[] | no       | User UUIDs to notify                           |

Endpoint: `PATCH /comments/{comment_id}`

---

## `scf_delete_comment`

Retract a comment you authored (write — author only). Soft delete: the thread keeps its place, the body is withdrawn.

| Parameter    | Type   | Required | Description                                    |
| ------------ | ------ | -------- | ---------------------------------------------- |
| `comment_id` | string | yes      | Comment UUID — obtain from `scf_list_comments` |

Endpoint: `DELETE /comments/{comment_id}`

---

## Example prompts

- "Who is assigned to our asset-inventory control?"
- "Assign Priya as the primary owner of the access-review evidence item."
- "Show me everything assigned to me."
- "Leave a comment on the firewall control asking the owner for the latest export."
- "Read the comment thread on the quarterly access review."
