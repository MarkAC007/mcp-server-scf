import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerWebhookTools(server: McpServer) {
  server.tool(
    "scf_create_webhook",
    "Create a webhook endpoint for evidence-inbox ingestion (write — admin role). Returns the plaintext HMAC signing secret exactly once — store it immediately; it cannot be retrieved later.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      name: z.string().describe("Human-readable label (e.g., 'Splunk SIEM', 'AWS Config')"),
      description: z.string().optional().describe("Free-text description of what this endpoint is for"),
      allowed_evidence_ids: z
        .array(z.string())
        .optional()
        .describe("Restrict ingestion to specific evidence IDs (e.g., ['ERL-IAM-001']); omit to allow any"),
      rate_limit_per_minute: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe("Per-endpoint rate limit in requests/min (1–10000); omit to use the org default"),
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
    "scf_list_webhooks",
    "List the organization's webhook endpoints (newest first). Returns name, status, delivery count, and secret prefix.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
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
    "scf_get_webhook",
    "Get one webhook endpoint's detail: delivery stats, allowed evidence IDs, and rate-limit configuration.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      endpoint_id: z.string().uuid().describe("Webhook endpoint UUID — obtain from scf_list_webhooks"),
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
    "scf_delete_webhook",
    "Revoke a webhook endpoint — soft-delete that marks it inactive (destructive write — admin role). Future deliveries return 403; the record remains for audit.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      endpoint_id: z.string().uuid().describe("Webhook endpoint UUID — obtain from scf_list_webhooks"),
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
    "scf_rotate_webhook_secret",
    "Rotate the HMAC signing secret for a webhook endpoint (write — admin role). The old secret is invalidated immediately. Returns the new plaintext secret exactly once.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      endpoint_id: z.string().uuid().describe("Webhook endpoint UUID — obtain from scf_list_webhooks"),
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
    "scf_list_webhook_deliveries",
    "List delivery logs for a webhook endpoint (newest first). Each entry shows signature validation result, processing status, evidence ID, and timestamps.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      endpoint_id: z.string().uuid().describe("Webhook endpoint UUID — obtain from scf_list_webhooks"),
      limit: z.number().int().min(1).max(200).default(50).describe("Page size (1–200, default 50)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Pagination offset — number of deliveries to skip (default 0)"),
    },
    async ({ org_id, endpoint_id, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/webhook-endpoints/${endpoint_id}/deliveries`, {
          limit,
          offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
