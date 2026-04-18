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

## `scf_get_audit_log`

Get one organization's audit trail: field-level changes to controls, evidence, and related entities, with actor, timestamp, and before/after values.

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `org_id`  | string | Yes      | Organization ID (UUID)                     |
| `limit`   | number | No       | Results to return (1–100, default 50)      |
| `offset`  | number | No       | Results to skip for pagination (default 0) |

---

## `scf_get_notifications`

Get the caller's notifications: new assignments, comments, status changes, and system alerts.

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
