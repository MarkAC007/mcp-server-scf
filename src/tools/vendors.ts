import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerVendorTools(server: McpServer) {
  server.tool(
    "list_vendors",
    "List third-party vendors in the organization's TPRM (Third-Party Risk Management) registry. Filter by status, criticality, or category.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      status: z.enum(["active", "inactive", "under_review"]).optional().describe("Vendor status filter"),
      criticality: z.enum(["critical", "high", "medium", "low"]).optional().describe("Vendor criticality filter"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ org_id, status, criticality, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors`, { status, criticality, page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_vendor",
    "Get detailed vendor information including certifications, assessments, risk score, and research results.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      vendor_id: z.string().describe("Vendor ID"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "create_vendor",
    "Add a new vendor to the TPRM registry. Triggers automatic risk scoring based on criticality and data handling.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      name: z.string().describe("Vendor name"),
      description: z.string().optional().describe("Vendor description"),
      category: z.string().optional().describe("Vendor category (e.g., 'SaaS', 'Infrastructure', 'Consulting')"),
      criticality: z.enum(["critical", "high", "medium", "low"]).default("medium").describe("Vendor criticality"),
      website: z.string().optional().describe("Vendor website URL"),
      contact_email: z.string().optional().describe("Primary contact email"),
    },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/vendors`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "trigger_vendor_research",
    "Trigger AI-powered security research for a vendor. Checks HIBP (breach databases), NVD (vulnerability databases), and public security posture. Returns a task ID for status polling.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      vendor_id: z.string().describe("Vendor ID"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/research`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_vendor_research",
    "Get the latest AI-powered research results for a vendor, including breach history, known vulnerabilities, and security posture analysis.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      vendor_id: z.string().describe("Vendor ID"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}/research/latest`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "trigger_dpsia",
    "Trigger a Data Protection Security Impact Assessment (DPSIA) for a vendor. Evaluates vendor security posture against CIA triad and certification requirements via AWS Lambda.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      vendor_id: z.string().describe("Vendor ID"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/dpsia`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
