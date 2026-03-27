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
      status: z.enum(["prospect", "active", "inactive", "under_review"]).optional().describe("Vendor status filter"),
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
      status: z.enum(["prospect", "active", "inactive", "under_review"]).default("prospect")
        .describe("Vendor status — defaults to 'prospect'"),
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
    "update_vendor",
    "Update an existing vendor record. All fields are optional — only provided fields are updated.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      vendor_id: z.string().describe("Vendor ID — get from list_vendors"),
      name: z.string().optional().describe("Vendor name"),
      description: z.string().optional().describe("Vendor description"),
      category: z.string().optional().describe("Vendor category (e.g., 'SaaS', 'Infrastructure', 'Consulting')"),
      criticality: z.enum(["critical", "high", "medium", "low"]).optional().describe("Vendor criticality"),
      status: z.enum(["prospect", "active", "inactive", "under_review"]).optional().describe("Vendor status"),
      website: z.string().optional().describe("Vendor website URL"),
      contact_email: z.string().optional().describe("Primary contact email"),
    },
    async ({ org_id, vendor_id, ...fields }) => {
      try {
        const client = getClient();
        const data = await client.patch(`/organizations/${org_id}/vendors/${vendor_id}`, fields);
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
      domain_override: z.string().optional().describe("Override the vendor's website domain for research lookup"),
    },
    async ({ org_id, vendor_id, domain_override }) => {
      try {
        const client = getClient();
        const body: Record<string, string> = {};
        if (domain_override) body.domain_override = domain_override;
        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/research`, body);
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
    "Trigger a Data Protection Security Impact Assessment (DPSIA) for a vendor. Evaluates vendor security posture against CIA triad and certification requirements.",
    {
      org_id: z.string().describe("Organization ID (UUID) — get from list_organizations"),
      vendor_id: z.string().describe("Vendor ID"),
      services_used: z.string().optional().describe("Description of services the vendor provides (auto-derived from vendor description if omitted)"),
      assessment_type: z.enum(["new", "annual-review", "adhoc"]).optional().default("new").describe("Type of assessment"),
      data_role: z.enum(["Processor", "Controller", "Joint Controller"]).optional().default("Processor").describe("Vendor data role"),
      client_name: z.string().optional().describe("Client/organisation name for the assessment"),
      additional_context: z.string().optional().describe("Additional context for the assessment (e.g., specific concerns, scope notes)"),
    },
    async ({ org_id, vendor_id, services_used, assessment_type, data_role, client_name, additional_context }) => {
      try {
        const client = getClient();

        // If services_used not provided, fetch from vendor description
        let effectiveServices: string = services_used || "";
        if (!effectiveServices) {
          const vendor = await client.get(`/organizations/${org_id}/vendors/${vendor_id}`);
          effectiveServices = (vendor as any).description || (vendor as any).name || "Third-party vendor services";
        }

        const body: Record<string, string> = {
          services_used: effectiveServices,
          assessment_type: assessment_type || "new",
          data_role: data_role || "Processor",
        };
        if (client_name) body.client_name = client_name;
        if (additional_context) body.additional_context = additional_context;

        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/dpsia`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
