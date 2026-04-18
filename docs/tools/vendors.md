# Vendor Risk (TPRM) tools

Third-party risk management with AI-powered security research (HIBP/NVD lookups, breach history, vulnerability scanning) and Data Protection Security Impact Assessments (DPSIA).

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

## `scf_trigger_dpsia`

Queue a Data Protection Security Impact Assessment (DPSIA) for a vendor (write — editor+ role, async). Scores posture against CIA triad and certification requirements.

| Parameter            | Type   | Required | Description                                                           |
| -------------------- | ------ | -------- | --------------------------------------------------------------------- |
| `org_id`             | string | Yes      | Organization ID (UUID)                                                |
| `vendor_id`          | string | Yes      | Vendor ID                                                             |
| `services_used`      | string | No       | Description of services the vendor provides (auto-derived if omitted) |
| `assessment_type`    | string | No       | `new` (default), `annual-review`, `adhoc`                             |
| `data_role`          | string | No       | `Processor` (default), `Controller`, `Joint Controller`               |
| `client_name`        | string | No       | Client/organisation name for the assessment                           |
| `additional_context` | string | No       | Additional context (e.g., specific concerns, scope notes)             |

---

## Example prompts

- "List all critical vendors and their risk scores."
- "Run a DPSIA on our cloud provider vendor."
- "What breaches has our payment processor had?"
- "Add Stripe as a critical vendor for payment processing."
