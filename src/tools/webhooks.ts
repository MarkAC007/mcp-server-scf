import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerWebhookTools(server: McpServer) {
  server.tool(
    "create_webhook",
    "Create a new webhook endpoint for evidence inbox ingestion. External systems use this endpoint to push evidence via HMAC-authenticated POST requests. Returns the plaintext signing secret once — it cannot be retrieved later.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      name: z.string().describe("Human-readable label for the endpoint (e.g., 'Splunk SIEM', 'AWS Config')"),
      description: z.string().optional().describe("Optional description of the endpoint's purpose"),
      allowed_evidence_ids: z.array(z.string()).optional().describe("Restrict ingestion to specific evidence IDs (e.g., ['ERL-IAM-001']). Null allows any evidence ID."),
      rate_limit_per_minute: z.number().min(1).max(10000).optional().describe("Per-endpoint rate limit (requests/min). Null uses the organization default."),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/webhook-endpoints`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_webhooks",
    "List all webhook endpoints for an organization, ordered by creation date (newest first). Shows endpoint name, status, delivery count, and secret prefix.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/webhook-endpoints`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_webhook",
    "Get detailed information about a single webhook endpoint including delivery stats, allowed evidence IDs, and rate limit configuration.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      endpoint_id: z.string().describe("Webhook endpoint ID (UUID) — get from list_webhooks"),
    },
    async ({ org_id, endpoint_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/webhook-endpoints/${endpoint_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "delete_webhook",
    "Revoke a webhook endpoint (soft-delete). Sets the endpoint to inactive — future deliveries will be rejected with 403. The endpoint record is preserved for audit trail purposes.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      endpoint_id: z.string().describe("Webhook endpoint ID (UUID) — get from list_webhooks"),
    },
    async ({ org_id, endpoint_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/webhook-endpoints/${endpoint_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "rotate_webhook_secret",
    "Generate a new HMAC signing secret for a webhook endpoint. The old secret is immediately invalidated. Returns the new plaintext secret once — store it securely.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      endpoint_id: z.string().describe("Webhook endpoint ID (UUID) — get from list_webhooks"),
    },
    async ({ org_id, endpoint_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/webhook-endpoints/${endpoint_id}/rotate-secret`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_webhook_deliveries",
    "List delivery logs for a webhook endpoint (newest first). Each entry shows signature validation result, processing status, evidence ID, and timestamps. Useful for debugging integration issues.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      endpoint_id: z.string().describe("Webhook endpoint ID (UUID) — get from list_webhooks"),
      limit: z.number().min(1).max(200).default(50).describe("Number of deliveries to return (max 200)"),
      offset: z.number().min(0).default(0).describe("Number of deliveries to skip for pagination"),
    },
    async ({ org_id, endpoint_id, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/webhook-endpoints/${endpoint_id}/deliveries`, { limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
