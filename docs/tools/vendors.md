# Vendor Risk (TPRM) tools

Third-party risk management with AI-powered security research (HIBP/NVD lookups, breach history, vulnerability scanning) and async AI vendor security assessments (the platform's replacement for DPSIA).

Source: [`src/tools/vendors.ts`](../../src/tools/vendors.ts).

---

## `scf_list_vendors`

List third-party vendors in the organization's TPRM (Third-Party Risk Management) registry. Optionally filter by status or criticality. Paginated.

| Parameter     | Type   | Required | Description                                      |
| ------------- | ------ | -------- | ------------------------------------------------ |
| `org_id`      | string | Yes      | Organization ID (UUID)                           |
| `status`      | string | No       | `prospect`, `active`, `inactive`, `under_review` |
| `criticality` | string | No       | `critical`, `high`, `medium`, `low`              |
| `page`        | number | No       | Page number (default 1)                          |
| `per_page`    | number | No       | Results per page (1–100, default 25)             |

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

| Parameter       | Type   | Required | Description                                                |
| --------------- | ------ | -------- | ---------------------------------------------------------- |
| `org_id`        | string | Yes      | Organization ID (UUID)                                     |
| `name`          | string | Yes      | Vendor name                                                |
| `description`   | string | No       | Vendor description                                         |
| `category`      | string | No       | Category (e.g., `SaaS`, `Infrastructure`, `Consulting`)    |
| `criticality`   | string | No       | `critical`, `high`, `medium` (default), `low`              |
| `status`        | string | No       | `prospect` (default), `active`, `inactive`, `under_review` |
| `website`       | string | No       | Vendor website URL                                         |
| `contact_email` | string | No       | Primary contact email                                      |

---

## `scf_update_vendor`

Update an existing vendor record (write — editor+ role). Only provided fields are applied.

| Parameter       | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `org_id`        | string | Yes      | Organization ID (UUID)                           |
| `vendor_id`     | string | Yes      | Vendor ID — get from `scf_list_vendors`          |
| `name`          | string | No       | Vendor name                                      |
| `description`   | string | No       | Vendor description                               |
| `category`      | string | No       | Category                                         |
| `criticality`   | string | No       | `critical`, `high`, `medium`, `low`              |
| `status`        | string | No       | `prospect`, `active`, `inactive`, `under_review` |
| `website`       | string | No       | Vendor website URL                               |
| `contact_email` | string | No       | Primary contact email                            |

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

## Example prompts

- "List all critical vendors and their risk scores."
- "Run an AI security assessment on our cloud provider vendor."
- "What breaches has our payment processor had?"
- "Add Stripe as a critical vendor for payment processing."
- "Show me the latest assessment report for AWS."
