# Organization & Platform tools

Current user profile, organization management, membership lookups, personal work queue, field-level audit trail, and notification feed.

Source: [`src/tools/organization.ts`](../../src/tools/organization.ts).

---

## `get_current_user`

Get the current authenticated user's profile, including name, email, organizations, and role.

_No parameters._

---

## `list_organizations`

List organizations the current user has access to. Returns org ID, name, tier, and member count.

_No parameters._

---

## `get_organization`

Get detailed organization information including subscription tier, member count, usage limits, and settings.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`  | string | Yes      | Organization ID (UUID) — get from `list_organizations` |

---

## `list_members`

List members of an organization with their roles (`admin`, `editor`, `viewer`).

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `get_work_queue`

Get the authenticated user's work queue — a prioritized list of pending tasks, assignments, and action items across all their organizations.

_No parameters._

---

## `get_audit_log`

Get the audit trail for an organization. Field-level changes to controls, evidence, and other entities with actor, timestamp, and before/after values.

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `org_id`  | string | Yes      | Organization ID (UUID)                     |
| `limit`   | number | No       | Results to return (1–100, default 50)      |
| `offset`  | number | No       | Results to skip for pagination (default 0) |

---

## `get_notifications`

Get notifications for the current user — new assignments, comments, status changes, and system alerts.

| Parameter     | Type    | Required | Description                                        |
| ------------- | ------- | -------- | -------------------------------------------------- |
| `unread_only` | boolean | No       | Only return unread notifications (default `false`) |
| `limit`       | number  | No       | Notifications to return (1–100, default 25)        |

---

## Example prompts

- "What's in my compliance work queue today?"
- "Show me who changed `AST-01` last week."
- "List the organizations I belong to."
- "Are there any unread notifications?"
