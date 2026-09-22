# Teams & Accountability tools

Teams are the organization's accountability layer. Each team aligns to one or more of the platform's fixed business functions, carries a roster with `primary` / `delegate` / `member` seats, and can be made accountable for scoped controls and evidence items. Teams are archived, never deleted, so historical assignments always resolve.

Source: [`src/tools/teams.ts`](../../src/tools/teams.ts).

The 11 tools split into three concerns:

1. **Functions and teams** — `scf_list_functions`, `scf_list_teams`, `scf_get_team`, `scf_create_team`, `scf_update_team`
2. **Membership** — `scf_add_team_member`, `scf_remove_team_member`
3. **Ownership of controls and evidence** — `scf_list_team_assignments`, `scf_create_team_assignment`, `scf_batch_create_team_assignments`, `scf_delete_team_assignment`

---

## `scf_list_functions`

List the platform's business functions (read — any member): the fixed set every team aligns to, identical for every tenant. Needed for the function_id on scf_create_team.

| Parameter          | Type    | Required | Description                                 |
| ------------------ | ------- | -------- | ------------------------------------------- |
| `include_inactive` | boolean | No       | Include retired functions (default `false`) |

---

## `scf_list_teams`

List the organization's teams (read — viewer role). Archived teams are hidden unless include_inactive is set; they are kept, never deleted, so history still resolves.

| Parameter          | Type    | Required | Description                                                                                                                                                                                                                                     |
| ------------------ | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`           | string  | Yes      | Organization ID (UUID) — get from `scf_list_organizations`                                                                                                                                                                                      |
| `function_id`      | string  | No       | Filter by business function (UUID) — get from `scf_list_functions`                                                                                                                                                                              |
| `include_inactive` | boolean | No       | Include archived teams (default `false`)                                                                                                                                                                                                        |
| `mine`             | boolean | No       | Only teams the caller is a member of (default `false`); each team then also carries `membership_role`. 'The caller' is the API key's identity — on a self-hosted instance a service account on no team, so this returns nothing; use `team_id`. |

---

## `scf_get_team`

Get one team with its full roster and advisory health warnings (read — viewer role), e.g. no primary owner or no members.

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID)                |
| `team_id` | string | Yes      | Team UUID — get from `scf_list_teams` |

---

## `scf_create_team`

Create a team aligned to a business function (write — admin role). The team is born empty; that is legal and reported through health warnings, not refused.

| Parameter      | Type     | Required | Description                                                      |
| -------------- | -------- | -------- | ---------------------------------------------------------------- |
| `org_id`       | string   | Yes      | Organization ID (UUID)                                           |
| `name`         | string   | Yes      | Team name (1–255 characters)                                     |
| `description`  | string   | No       | What the team is responsible for                                 |
| `function_id`  | string   | Yes      | Primary business function (UUID) — get from `scf_list_functions` |
| `function_ids` | string[] | No       | Additional functions the team serves (UUIDs)                     |

---

## `scf_update_team`

Update a team's name, description, function alignment or active flag (write — admin role). Set is_active=false to archive; the row is never deleted.

| Parameter      | Type     | Required | Description                                             |
| -------------- | -------- | -------- | ------------------------------------------------------- |
| `org_id`       | string   | Yes      | Organization ID (UUID)                                  |
| `team_id`      | string   | Yes      | Team UUID — get from `scf_list_teams`                   |
| `name`         | string   | No       | New team name                                           |
| `description`  | string   | No       | New description                                         |
| `function_id`  | string   | No       | New primary business function (UUID)                    |
| `function_ids` | string[] | No       | Replacement set of additional functions the team serves |
| `is_active`    | boolean  | No       | `false` archives the team                               |

---

## `scf_add_team_member`

Add an organization member to a team as primary, delegate or member (write — admin role). Adding a primary or delegate when the seat is taken demotes the incumbent to member.

| Parameter         | Type   | Required | Description                             |
| ----------------- | ------ | -------- | --------------------------------------- |
| `org_id`          | string | Yes      | Organization ID (UUID)                  |
| `team_id`         | string | Yes      | Team UUID — get from `scf_list_teams`   |
| `user_id`         | string | Yes      | User UUID — get from `scf_list_members` |
| `membership_role` | string | Yes      | `primary`, `delegate`, or `member`      |

---

## `scf_remove_team_member`

Remove a user from a team (destructive write — admin role). The membership row is deleted; the audit trail keeps the history.

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID)                |
| `team_id` | string | Yes      | Team UUID — get from `scf_list_teams` |
| `user_id` | string | Yes      | User UUID — get from `scf_get_team`   |

---

## `scf_list_team_assignments`

Map of which team owns which scoped control or evidence item (read — viewer role). Unfiltered returns the whole map; narrow with item_ids, team_id or accountable_only.

| Parameter          | Type     | Required | Description                                          |
| ------------------ | -------- | -------- | ---------------------------------------------------- |
| `org_id`           | string   | Yes      | Organization ID (UUID)                               |
| `type`             | string   | Yes      | `control` or `evidence`                              |
| `item_ids`         | string[] | No       | Restrict to these item UUIDs                         |
| `team_id`          | string   | No       | Restrict to one team                                 |
| `accountable_only` | boolean  | No       | Only the accountable team per item (default `false`) |

---

## `scf_create_team_assignment`

Assign a team to one scoped control or evidence item (write — admin role). is_accountable makes it the accountable team and demotes any incumbent to consulted.

| Parameter        | Type    | Required | Description                                      |
| ---------------- | ------- | -------- | ------------------------------------------------ |
| `org_id`         | string  | Yes      | Organization ID (UUID)                           |
| `type`           | string  | Yes      | `control` or `evidence`                          |
| `item_id`        | string  | Yes      | Scoped control or evidence tracking record UUID  |
| `team_id`        | string  | Yes      | Team UUID — get from `scf_list_teams`            |
| `is_accountable` | boolean | No       | Make this the accountable team (default `false`) |

---

## `scf_batch_create_team_assignments`

Assign one team to up to 500 controls or evidence items in one transaction with one aggregate notification (write — admin role). The bulk accountability tool.

| Parameter        | Type     | Required | Description                                      |
| ---------------- | -------- | -------- | ------------------------------------------------ |
| `org_id`         | string   | Yes      | Organization ID (UUID)                           |
| `type`           | string   | Yes      | `control` or `evidence`                          |
| `team_id`        | string   | Yes      | Team UUID — get from `scf_list_teams`            |
| `item_ids`       | string[] | Yes      | Item UUIDs to assign, max 500                    |
| `is_accountable` | boolean  | No       | Make this the accountable team (default `false`) |

---

## `scf_delete_team_assignment`

Remove a team's assignment from a control or evidence item (destructive write — admin role).

| Parameter       | Type   | Required | Description                                             |
| --------------- | ------ | -------- | ------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                  |
| `assignment_id` | string | Yes      | Team assignment UUID — from `scf_list_team_assignments` |

---

## Example prompts

- "Which business functions can a team align to?"
- "Create a Security Operations team under the Security function."
- "Who is the primary owner of the Platform Engineering team?"
- "Make the Security Operations team accountable for every control in the `IAC` domain."
- "Show me every control the Platform Engineering team owns."
