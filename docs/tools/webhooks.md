# Webhook tools

Manage HMAC-authenticated webhook endpoints for evidence inbox ingestion. External systems (SIEMs, CSPMs, ticketing tools) use these endpoints to push evidence into the platform via signed POST requests.

Source: [`src/tools/webhooks.ts`](../../src/tools/webhooks.ts).

The 6 tools split into three concerns:

1. **Endpoint CRUD** — `scf_create_webhook`, `scf_list_webhooks`, `scf_get_webhook`, `scf_delete_webhook`
2. **Secret rotation** — `scf_rotate_webhook_secret`
3. **Delivery logs** — `scf_list_webhook_deliveries`

> **Security note:** the HMAC signing secret is returned **once** on creation and rotation — it cannot be retrieved later. Store it in a secret manager before the response is discarded.

---

## `scf_create_webhook`

Create a webhook endpoint for evidence-inbox ingestion (write — admin role). Returns the plaintext HMAC signing secret exactly once — store it immediately; it cannot be retrieved later.

| Parameter               | Type   | Required | Description                                                                                         |
| ----------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `org_id`                | string | Yes      | Organization ID (UUID)                                                                              |
| `name`                  | string | Yes      | Human-readable label (e.g., `Splunk SIEM`, `AWS Config`)                                            |
| `description`           | string | No       | Optional description of the endpoint's purpose                                                      |
| `allowed_evidence_ids`  | array  | No       | Restrict ingestion to specific evidence IDs (e.g., `['ERL-IAM-001']`). Null allows any evidence ID. |
| `rate_limit_per_minute` | number | No       | Per-endpoint rate limit (1–10000 req/min). Null uses the organization default.                      |

---

## `scf_list_webhooks`

List the organization's webhook endpoints (newest first). Returns name, status, delivery count, and secret prefix.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `scf_get_webhook`

Get one webhook endpoint's detail: delivery stats, allowed evidence IDs, and rate-limit configuration.

| Parameter     | Type   | Required | Description                                               |
| ------------- | ------ | -------- | --------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                                    |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID) — get from `scf_list_webhooks` |

---

## `scf_delete_webhook`

Revoke a webhook endpoint — soft-delete that marks it inactive (destructive write — admin role). Future deliveries return 403; the record remains for audit.

| Parameter     | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)     |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID) |

---

## `scf_rotate_webhook_secret`

Rotate the HMAC signing secret for a webhook endpoint (write — admin role). The old secret is invalidated immediately. Returns the new plaintext secret exactly once.

| Parameter     | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)     |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID) |

---

## `scf_list_webhook_deliveries`

List delivery logs for a webhook endpoint (newest first). Each entry shows signature validation result, processing status, evidence ID, and timestamps.

| Parameter     | Type   | Required | Description                                             |
| ------------- | ------ | -------- | ------------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                                  |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID)                              |
| `limit`       | number | No       | Number of deliveries to return (1–200, default 50)      |
| `offset`      | number | No       | Number of deliveries to skip for pagination (default 0) |

---

## Example prompts

- "Create a webhook endpoint for our Splunk SIEM restricted to `ERL-IAM-001`."
- "List all webhook endpoints and their delivery counts."
- "Rotate the secret on our AWS Config webhook."
- "Show me the last 20 delivery failures for endpoint X."
