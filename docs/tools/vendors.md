# Vendor Risk (TPRM) tools

Third-party risk management with AI-powered security research (HIBP/NVD lookups, breach history, vulnerability scanning) and async AI vendor security assessments (the platform's replacement for DPSIA).

Source: [`src/tools/vendors.ts`](../../src/tools/vendors.ts).

The 23 tools split into four concerns:

1. **Vendor registry** — `scf_list_vendors`, `scf_get_vendor`, `scf_create_vendor`, `scf_update_vendor`
2. **AI research and assessments** — `scf_trigger_vendor_research`, `scf_get_vendor_research`, `scf_trigger_vendor_assessment`, `scf_list_vendor_assessments`, `scf_get_latest_vendor_assessment`, `scf_get_vendor_assessment`, `scf_get_vendor_assessment_status`
3. **Certifications** — `scf_list_vendor_certifications`, `scf_create_vendor_certification`, `scf_update_vendor_certification`, `scf_delete_vendor_certification`
4. **Remediation** — `scf_list_vendor_action_items`, `scf_create_vendor_action_item`, `scf_update_vendor_action_item`, `scf_delete_vendor_action_item`, `scf_list_compensating_controls`, `scf_create_compensating_control`, `scf_update_compensating_control`, `scf_delete_compensating_control`

---

## `scf_list_vendors`

List third-party vendors in the organization's TPRM (Third-Party Risk Management) registry. Optionally filter by status or criticality. Paginated.

| Parameter     | Type   | Required | Description                                                                                                                                      |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `org_id`      | string | Yes      | Organization ID (UUID)                                                                                                                           |
| `status`      | string | No       | `prospect`, `active`, `under_review`, `approved`, `suspended`, `offboarded` — the platform's full list, mirrored in `src/lib/vendor-statuses.ts` |
| `criticality` | string | No       | `critical`, `high`, `medium`, `low`                                                                                                              |
| `page`        | number | No       | Page number (default 1)                                                                                                                          |
| `per_page`    | number | No       | Results per page (1–100, default 25)                                                                                                             |

---

## `scf_get_vendor`

Get one vendor's detail: certifications, assessments, computed risk score, and latest research results.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) |
| `vendor_id` | string | Yes      | Vendor ID              |

---

## `scf_create_vendor`

Create a vendor in the TPRM registry (write — editor+ role). Platform auto-scores risk based on criticality and data handling.

| Parameter       | Type   | Required | Description                                                                           |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                                                |
| `name`          | string | Yes      | Vendor name                                                                           |
| `description`   | string | No       | Vendor description                                                                    |
| `category`      | string | No       | Category (e.g., `SaaS`, `Infrastructure`, `Consulting`)                               |
| `criticality`   | string | No       | `critical`, `high`, `medium` (default), `low`                                         |
| `status`        | string | No       | `prospect` (default), `active`, `under_review`, `approved`, `suspended`, `offboarded` |
| `website`       | string | No       | Vendor website URL                                                                    |
| `contact_email` | string | No       | Primary contact email                                                                 |

---

## `scf_update_vendor`

Update an existing vendor record (write — editor+ role). Only provided fields are applied.

| Parameter       | Type   | Required | Description                              |
| --------------- | ------ | -------- | ---------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                   |
| `vendor_id`     | string | Yes      | Vendor ID — get from `scf_list_vendors`  |
| `name`          | string | No       | Vendor name                              |
| `description`   | string | No       | Vendor description                       |
| `category`      | string | No       | Category                                 |
| `criticality`   | string | No       | `critical`, `high`, `medium`, `low`      |
| `status`        | string | No       | Same 6-value enum as `scf_create_vendor` |
| `website`       | string | No       | Vendor website URL                       |
| `contact_email` | string | No       | Primary contact email                    |

---

## `scf_trigger_vendor_research`

Queue AI security research for a vendor (write — editor+ role, async). Checks HIBP breach data, NVD vulnerabilities, and public posture. Returns a task ID; poll scf_get_vendor_research.

| Parameter         | Type   | Required | Description                                              |
| ----------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`          | string | Yes      | Organization ID (UUID)                                   |
| `vendor_id`       | string | Yes      | Vendor ID                                                |
| `domain_override` | string | No       | Override the vendor's website domain for research lookup |

---

## `scf_get_vendor_research`

Get the latest vendor research result: breach history, known vulnerabilities, and security posture analysis. Poll this after scf_trigger_vendor_research.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) |
| `vendor_id` | string | Yes      | Vendor ID              |

---

## `scf_trigger_vendor_assessment`

Queue an AI vendor security assessment (write — editor+ role, async, HTTP 202). Replaces the removed `scf_trigger_dpsia` tool — the platform deprecated the `/dpsia` endpoints in favour of `/assessments`. Returns `assessment_id` + `job_id`; poll `scf_get_vendor_assessment_status`.

| Parameter            | Type   | Required | Description                                                                          |
| -------------------- | ------ | -------- | ------------------------------------------------------------------------------------ |
| `org_id`             | string | Yes      | Organization ID (UUID)                                                               |
| `vendor_id`          | string | Yes      | Vendor ID                                                                            |
| `services_used`      | string | No       | Services the vendor provides, 1–2000 chars (auto-derived from the record if omitted) |
| `assessment_type`    | string | No       | `initial` (default), `annual`, `adhoc`                                               |
| `data_role`          | string | No       | `Processor` (default), `Controller`, `Joint Controller`                              |
| `additional_context` | string | No       | Additional context, max 5000 chars (e.g., specific concerns, scope notes)            |

---

## `scf_list_vendor_assessments`

List a vendor's AI security assessments, newest first. Each record includes status, RAG rating, recommendation, and report fields.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) |
| `vendor_id` | string | Yes      | Vendor ID              |

---

## `scf_get_latest_vendor_assessment`

Get a vendor's latest **completed** AI security assessment: RAG status, recommendation, executive summary, `report_markdown`/`report_json`. Returns 404 if none completed yet.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) |
| `vendor_id` | string | Yes      | Vendor ID              |

---

## `scf_get_vendor_assessment`

Get one vendor AI assessment by ID with full detail: `services_used`, `data_role`, RAG status, recommendation, full report fields, and research sources.

| Parameter       | Type   | Required | Description                                         |
| --------------- | ------ | -------- | --------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                              |
| `vendor_id`     | string | Yes      | Vendor ID                                           |
| `assessment_id` | string | Yes      | Assessment UUID — from list or the trigger response |

---

## `scf_get_vendor_assessment_status`

Get the job status of a queued vendor AI assessment: `status`, `started_at`, `completed_at`, `error_message`. Poll after `scf_trigger_vendor_assessment`.

| Parameter       | Type   | Required | Description                                            |
| --------------- | ------ | -------- | ------------------------------------------------------ |
| `org_id`        | string | Yes      | Organization ID (UUID)                                 |
| `vendor_id`     | string | Yes      | Vendor ID                                              |
| `assessment_id` | string | Yes      | Assessment UUID — from `scf_trigger_vendor_assessment` |

---

## `scf_list_vendor_certifications`

List a vendor's certifications (read — viewer role): name, issuing body, certificate number, status, issue and expiry dates, scope and verification URL.

| Parameter   | Type   | Required | Description                               |
| ----------- | ------ | -------- | ----------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                    |
| `vendor_id` | string | Yes      | Vendor UUID — get from `scf_list_vendors` |

---

## `scf_create_vendor_certification`

Record a certification a vendor holds (write — editor role), e.g. ISO 27001 or SOC 2 Type II. Status defaults to `valid`; track `expiry_date` so renewals surface.

| Parameter            | Type   | Required | Description                                        |
| -------------------- | ------ | -------- | -------------------------------------------------- |
| `org_id`             | string | Yes      | Organization ID (UUID)                             |
| `vendor_id`          | string | Yes      | Vendor UUID — get from `scf_list_vendors`          |
| `certification_name` | string | Yes      | Certification name, e.g. `ISO 27001:2022`          |
| `certification_body` | string | No       | Issuing body                                       |
| `certificate_number` | string | No       | Certificate number                                 |
| `status`             | string | No       | `valid` (default), `expired`, `revoked`, `pending` |
| `issue_date`         | string | No       | `YYYY-MM-DD`                                       |
| `expiry_date`        | string | No       | `YYYY-MM-DD`                                       |
| `scope`              | string | No       | Certification scope statement                      |
| `verification_url`   | string | No       | Public verification URL                            |

---

## `scf_update_vendor_certification`

Update a vendor certification (write — editor role). Only passed fields change; use it to mark a certificate expired or revoked, or to record the renewed expiry date.

| Parameter            | Type   | Required | Description                                                    |
| -------------------- | ------ | -------- | -------------------------------------------------------------- |
| `org_id`             | string | Yes      | Organization ID (UUID)                                         |
| `vendor_id`          | string | Yes      | Vendor UUID — get from `scf_list_vendors`                      |
| `cert_id`            | string | Yes      | Certification UUID — get from `scf_list_vendor_certifications` |
| `certification_name` | string | No       | Certification name                                             |
| `certification_body` | string | No       | Issuing body                                                   |
| `certificate_number` | string | No       | Certificate number                                             |
| `status`             | string | No       | `valid`, `expired`, `revoked`, `pending`                       |
| `issue_date`         | string | No       | `YYYY-MM-DD`                                                   |
| `expiry_date`        | string | No       | `YYYY-MM-DD`                                                   |
| `scope`              | string | No       | Certification scope statement                                  |
| `verification_url`   | string | No       | Public verification URL                                        |

---

## `scf_delete_vendor_certification`

Delete a vendor certification record (destructive write — editor role). Prefer `status=expired` or `revoked` when the history matters.

| Parameter   | Type   | Required | Description                                                    |
| ----------- | ------ | -------- | -------------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                                         |
| `vendor_id` | string | Yes      | Vendor UUID — get from `scf_list_vendors`                      |
| `cert_id`   | string | Yes      | Certification UUID — get from `scf_list_vendor_certifications` |

---

## `scf_list_vendor_action_items`

List remediation action items for one vendor, or across every vendor when `vendor_id` is omitted (read — viewer role). Filter by status or priority.

| Parameter   | Type   | Required | Description                                     |
| ----------- | ------ | -------- | ----------------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                          |
| `vendor_id` | string | No       | Vendor UUID — omit to list across all vendors   |
| `status`    | string | No       | `open`, `in_progress`, `completed`, `cancelled` |
| `priority`  | string | No       | `critical`, `high`, `medium`, `low`             |

---

## `scf_create_vendor_action_item`

Create a remediation action item against a vendor (write — editor role), typically from an assessment finding. Priority defaults to `medium`, status to `open`.

| Parameter        | Type   | Required | Description                                               |
| ---------------- | ------ | -------- | --------------------------------------------------------- |
| `org_id`         | string | Yes      | Organization ID (UUID)                                    |
| `vendor_id`      | string | Yes      | Vendor UUID — get from `scf_list_vendors`                 |
| `title`          | string | Yes      | Action item title (1–255 chars)                           |
| `description`    | string | No       | Action item detail                                        |
| `priority`       | string | No       | `critical`, `high`, `medium` (default), `low`             |
| `status`         | string | No       | `open` (default), `in_progress`, `completed`, `cancelled` |
| `category`       | string | No       | Free-text category, e.g. `contractual`, `technical`       |
| `owner_name`     | string | No       | Owner name                                                |
| `owner_user_id`  | string | No       | Owner UUID — get from `scf_list_members`                  |
| `due_date`       | string | No       | `YYYY-MM-DD`                                              |
| `completed_date` | string | No       | `YYYY-MM-DD`                                              |

---

## `scf_update_vendor_action_item`

Update a vendor action item (write — editor role). Only passed fields change; set `status=completed` with `completed_date` to close it.

| Parameter        | Type   | Required | Description                                                |
| ---------------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`         | string | Yes      | Organization ID (UUID)                                     |
| `vendor_id`      | string | Yes      | Vendor UUID — get from `scf_list_vendors`                  |
| `item_id`        | string | Yes      | Action item UUID — get from `scf_list_vendor_action_items` |
| `title`          | string | No       | Action item title (1–255 chars)                            |
| `description`    | string | No       | Action item detail                                         |
| `priority`       | string | No       | `critical`, `high`, `medium`, `low`                        |
| `status`         | string | No       | `open`, `in_progress`, `completed`, `cancelled`            |
| `category`       | string | No       | Free-text category, e.g. `contractual`, `technical`        |
| `owner_name`     | string | No       | Owner name                                                 |
| `owner_user_id`  | string | No       | Owner UUID — get from `scf_list_members`                   |
| `due_date`       | string | No       | `YYYY-MM-DD`                                               |
| `completed_date` | string | No       | `YYYY-MM-DD`                                               |

---

## `scf_delete_vendor_action_item`

Delete a vendor action item (destructive write — editor role). Prefer `status=cancelled` when the record should stay visible.

| Parameter   | Type   | Required | Description                                                |
| ----------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                                     |
| `vendor_id` | string | Yes      | Vendor UUID — get from `scf_list_vendors`                  |
| `item_id`   | string | Yes      | Action item UUID — get from `scf_list_vendor_action_items` |

---

## `scf_list_compensating_controls`

List the compensating controls recorded against a vendor's gaps (read — viewer role): the gap, the control that offsets it, its effectiveness rating and risk-reduction notes.

| Parameter   | Type   | Required | Description                               |
| ----------- | ------ | -------- | ----------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                    |
| `vendor_id` | string | Yes      | Vendor UUID — get from `scf_list_vendors` |

---

## `scf_create_compensating_control`

Record a compensating control for a vendor gap (write — editor role): what the gap is, what offsets it, and how effective that is (`full`, `partial` or `minimal` — default `partial`).

| Parameter              | Type   | Required | Description                               |
| ---------------------- | ------ | -------- | ----------------------------------------- |
| `org_id`               | string | Yes      | Organization ID (UUID)                    |
| `vendor_id`            | string | Yes      | Vendor UUID — get from `scf_list_vendors` |
| `gap_description`      | string | Yes      | The gap the control offsets               |
| `compensating_control` | string | Yes      | The control that offsets the gap          |
| `effectiveness_rating` | string | No       | `full`, `partial` (default), `minimal`    |
| `risk_reduction_notes` | string | No       | How much residual risk this removes       |

---

## `scf_update_compensating_control`

Update a vendor compensating control (write — editor role). Only passed fields change: gap description, control text, effectiveness rating, risk-reduction notes.

| Parameter              | Type   | Required | Description                                                           |
| ---------------------- | ------ | -------- | --------------------------------------------------------------------- |
| `org_id`               | string | Yes      | Organization ID (UUID)                                                |
| `vendor_id`            | string | Yes      | Vendor UUID — get from `scf_list_vendors`                             |
| `cc_id`                | string | Yes      | Compensating control UUID — get from `scf_list_compensating_controls` |
| `gap_description`      | string | No       | The gap the control offsets                                           |
| `compensating_control` | string | No       | The control that offsets the gap                                      |
| `effectiveness_rating` | string | No       | `full`, `partial`, `minimal`                                          |
| `risk_reduction_notes` | string | No       | How much residual risk this removes                                   |

---

## `scf_delete_compensating_control`

Delete a vendor compensating control record (destructive write — editor role).

| Parameter   | Type   | Required | Description                                                           |
| ----------- | ------ | -------- | --------------------------------------------------------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID)                                                |
| `vendor_id` | string | Yes      | Vendor UUID — get from `scf_list_vendors`                             |
| `cc_id`     | string | Yes      | Compensating control UUID — get from `scf_list_compensating_controls` |

---

## Example prompts

- "List all critical vendors and their risk scores."
- "Run an AI security assessment on our cloud provider vendor."
- "What breaches has our payment processor had?"
- "Add Stripe as a critical vendor for payment processing."
- "Show me the latest assessment report for AWS."
