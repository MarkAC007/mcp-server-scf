# Webhook tools

Manage HMAC-authenticated webhook endpoints for evidence inbox ingestion. External systems (SIEMs, CSPMs, ticketing tools) use these endpoints to push evidence into the platform via signed POST requests.

Source: [`src/tools/webhooks.ts`](../../src/tools/webhooks.ts).

The 6 tools split into three concerns:

1. **Endpoint CRUD** — `create_webhook`, `list_webhooks`, `get_webhook`, `delete_webhook`
2. **Secret rotation** — `rotate_webhook_secret`
3. **Delivery logs** — `list_webhook_deliveries`

> **Security note:** the HMAC signing secret is returned **once** on creation and rotation — it cannot be retrieved later. Store it in a secret manager before the response is discarded.

---

## `create_webhook`

Create a new webhook endpoint for evidence inbox ingestion. External systems push evidence via HMAC-authenticated POST requests. Returns the plaintext signing secret once — it cannot be retrieved later.

| Parameter               | Type   | Required | Description                                                                                         |
| ----------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `org_id`                | string | Yes      | Organization ID (UUID)                                                                              |
| `name`                  | string | Yes      | Human-readable label (e.g., `Splunk SIEM`, `AWS Config`)                                            |
| `description`           | string | No       | Optional description of the endpoint's purpose                                                      |
| `allowed_evidence_ids`  | array  | No       | Restrict ingestion to specific evidence IDs (e.g., `['ERL-IAM-001']`). Null allows any evidence ID. |
| `rate_limit_per_minute` | number | No       | Per-endpoint rate limit (1–10000 req/min). Null uses the organization default.                      |

---

## `list_webhooks`

List all webhook endpoints for an organization, ordered by creation date (newest first). Shows endpoint name, status, delivery count, and secret prefix.

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `org_id`  | string | Yes      | Organization ID (UUID) |

---

## `get_webhook`

Get detailed information about a single webhook endpoint including delivery stats, allowed evidence IDs, and rate limit configuration.

| Parameter     | Type   | Required | Description                                           |
| ------------- | ------ | -------- | ----------------------------------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)                                |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID) — get from `list_webhooks` |

---

## `delete_webhook`

Revoke a webhook endpoint (soft-delete). Sets the endpoint to inactive — future deliveries will be rejected with 403. The endpoint record is preserved for audit trail.

| Parameter     | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)     |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID) |

---

## `rotate_webhook_secret`

Generate a new HMAC signing secret for a webhook endpoint. The old secret is immediately invalidated. Returns the new plaintext secret once — store it securely.

| Parameter     | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| `org_id`      | string | Yes      | Organization ID (UUID)     |
| `endpoint_id` | string | Yes      | Webhook endpoint ID (UUID) |

---

## `list_webhook_deliveries`

List delivery logs for a webhook endpoint (newest first). Each entry shows signature validation result, processing status, evidence ID, and timestamps. Useful for debugging integration issues.

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
