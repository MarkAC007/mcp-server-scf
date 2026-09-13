# Organization & Platform tools

Current user profile, organization management, membership lookups, personal work queue, field-level audit trail, and notification feed.

Source: [`src/tools/organization.ts`](../../src/tools/organization.ts).

---

## `scf_get_current_user`

Get the authenticated caller's profile: name, email, organization memberships, and per-org role.

_No parameters._

---

## `scf_list_organizations`

List every organization the caller has access to. Returns org UUID, name, subscription tier, and member count. Use this first to obtain the org_id other tools need.

_No parameters._

---

## `scf_get_organization`

Get one organization's detail: subscription tier, member count, usage limits, and settings.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `scf_list_organizations` |

---

## `scf_list_members`

List members of one organization with their role (admin, editor, or viewer).

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_get_work_queue`

Get the caller's work queue: prioritized pending tasks, assignments, and action items across every organization they belong to.

_No parameters._

---

## `scf_get_org_work_queue`

Get one organization's consolidated GRC work queue: overdue evidence tasks, blocking controls, and stale collection schedules. `assigned_to_me` narrows to the caller's items.

| Parameter        | Type    | Required | Description                                                   |
| ---------------- | ------- | -------- | ------------------------------------------------------------- |
| `org_id`         | string  | yes      | Organization UUID — obtain from `scf_list_organizations`      |
| `assigned_to_me` | boolean | no       | Only items owned by or assigned to the caller (default false) |

Overdue evidence and stale collections are disjoint by construction: an overdue item has an open task to complete, a stale one has no task and needs one raised. `total_items` is therefore a real count.

---

## `scf_get_audit_log`

Query one organization's append-only audit trail (read — viewer role): field-level changes with actor, source and before/after values. Filter by entity, control, action, actor, source, date or text.

| Parameter            | Type   | Required | Description                                                                                                                                               |
| -------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`             | string | Yes      | Organization UUID — obtain from scf_list_organizations                                                                                                    |
| `entity_type`        | string | No       | Filter by exact entity type as written in the log, e.g. scoped_control, evidence_file, audit_engagement, vendor — unsure of the spelling? use search_text |
| `entity_id`          | string | No       | Filter by the changed entity's UUID                                                                                                                       |
| `scf_id`             | string | No       | Filter by SCF control ID in DOMAIN-NN format                                                                                                              |
| `action`             | enum   | No       | Filter by action: create, update or delete                                                                                                                |
| `changed_by_user_id` | string | No       | Filter by the user who made the change — obtain from scf_list_members                                                                                     |
| `action_source`      | enum   | No       | Filter by origin of the change: ui, api_key, mcp or system                                                                                                |
| `request_id`         | string | No       | Filter by request correlation ID — groups every change one API call made                                                                                  |
| `date_from`          | string | No       | Include changes at or after this ISO-8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)                                                                                |
| `date_to`            | string | No       | Include changes at or before this ISO-8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)                                                                               |
| `actor_id`           | string | No       | Filter by actor user UUID — platform alias of changed_by_user_id                                                                                          |
| `search_text`        | string | No       | Case-insensitive search across entity_type, field_name, old_value and new_value                                                                           |
| `limit`              | number | No       | Page size (1–200, default 50)                                                                                                                             |
| `offset`             | number | No       | Pagination offset — number of results to skip (default 0)                                                                                                 |

Every request this server makes carries `X-Audit-Source: mcp`, so changes made through these tools show up here with `action_source = mcp` rather than `api_key`.

---

## `scf_get_change_cursor`

Cheap has-anything-changed probe (read — viewer role): newest audit timestamp and row count for one organization. Compare with the pair you last saw; poll this before re-pulling the audit log.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization UUID — obtain from scf_list_organizations |

Returns `{ "cursor": "<ISO timestamp or null>", "count": <int> }`. Both values are opaque — the contract is "changed or not", never "how much".

---

## `scf_get_notifications`

Get the caller's notifications: new assignments, comments, status changes, and system alerts.

| Parameter     | Type    | Required | Description                                        |
| ------------- | ------- | -------- | -------------------------------------------------- |
| `unread_only` | boolean | No       | Only return unread notifications (default `false`) |
| `limit`       | number  | No       | Notifications to return (1–100, default 25)        |

---

## `scf_mark_notifications_read`

Mark notifications read for the current user (write — self only): one by `notification_id`, or every notification when `all=true`. Acknowledge after processing `scf_get_notifications`.

| Parameter         | Type    | Required | Description                                                                          |
| ----------------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| `notification_id` | string  | no       | Notification UUID to mark read                                                       |
| `all`             | boolean | no       | Mark every notification read — explicit opt-in, ignored when `notification_id` given |

Calling with neither returns an error rather than defaulting to the broader write.

----------------- | ------ | -------- | ----------------------------------------- |
| `notification_id` | string | No | Notification UUID — omit to mark all read |

---

## Example prompts

- "What's in my compliance work queue today?"
- "Show me who changed `AST-01` last week."
- "List the organizations I belong to."
- "Are there any unread notifications?"
