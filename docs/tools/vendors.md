# Vendor Risk (TPRM) tools

Third-party risk management with AI-powered security research (HIBP/NVD lookups, breach history, vulnerability scanning) and Data Protection Security Impact Assessments (DPSIA).

Source: [`src/tools/vendors.ts`](../../src/tools/vendors.ts).

---

## `list_vendors`

List third-party vendors in the organization's TPRM registry. Filter by status, criticality, or category.

| Parameter     | Type   | Required | Description                                      |
| ------------- | ------ | -------- | ------------------------------------------------ |
| `org_id`      | string | Yes      | Organization ID (UUID)                           |
| `status`      | string | No       | `prospect`, `active`, `inactive`, `under_review` |
| `criticality` | string | No       | `critical`, `high`, `medium`, `low`              |
| `page`        | number | No       | Page number (default 1)                          |
| `per_page`    | number | No       | Results per page (1–100, default 25)             |

---

## `get_vendor`

Get detailed vendor information including certifications, assessments, risk score, and research results.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) |
| `vendor_id` | string | Yes      | Vendor ID              |

---

## `create_vendor`

Add a new vendor to the TPRM registry. Triggers automatic risk scoring based on criticality and data handling.

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

## `update_vendor`

Update an existing vendor record. All fields are optional — only provided fields are updated.

| Parameter       | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `org_id`        | string | Yes      | Organization ID (UUID)                           |
| `vendor_id`     | string | Yes      | Vendor ID — get from `list_vendors`              |
| `name`          | string | No       | Vendor name                                      |
| `description`   | string | No       | Vendor description                               |
| `category`      | string | No       | Category                                         |
| `criticality`   | string | No       | `critical`, `high`, `medium`, `low`              |
| `status`        | string | No       | `prospect`, `active`, `inactive`, `under_review` |
| `website`       | string | No       | Vendor website URL                               |
| `contact_email` | string | No       | Primary contact email                            |

---

## `trigger_vendor_research`

Trigger AI-powered security research for a vendor. Checks HIBP (breach databases), NVD (vulnerability databases), and public security posture. Returns a task ID for status polling.

| Parameter         | Type   | Required | Description                                              |
| ----------------- | ------ | -------- | -------------------------------------------------------- |
| `org_id`          | string | Yes      | Organization ID (UUID)                                   |
| `vendor_id`       | string | Yes      | Vendor ID                                                |
| `domain_override` | string | No       | Override the vendor's website domain for research lookup |

---

## `get_vendor_research`

Get the latest AI-powered research results for a vendor — breach history, known vulnerabilities, and security posture analysis.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `org_id`    | string | Yes      | Organization ID (UUID) |
| `vendor_id` | string | Yes      | Vendor ID              |

---

## `trigger_dpsia`

Trigger a Data Protection Security Impact Assessment (DPSIA) for a vendor. Evaluates security posture against the CIA triad and certification requirements. If `services_used` is omitted, it's auto-derived from the vendor description.

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
