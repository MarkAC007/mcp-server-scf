import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerVendorTools(server: McpServer) {
  server.tool(
    "scf_list_vendors",
    "List third-party vendors in the organization's TPRM (Third-Party Risk Management) registry. Optionally filter by status or criticality. Paginated.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      status: z.enum(["prospect", "active", "inactive", "under_review"]).optional().describe("Lifecycle status filter"),
      criticality: z.enum(["critical", "high", "medium", "low"]).optional().describe("Criticality tier filter"),
      page: z.number().int().min(1).default(1).describe("1-indexed page number (default 1)"),
      per_page: z.number().int().min(1).max(100).default(25).describe("Page size (1–100, default 25)"),
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
    "scf_get_vendor",
    "Get one vendor's detail: certifications, assessments, computed risk score, and latest research results.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
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
    "scf_create_vendor",
    "Create a vendor in the TPRM registry (write — editor+ role). Platform auto-scores risk based on criticality and data handling.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      name: z.string().describe("Vendor legal or trading name (required)"),
      description: z.string().optional().describe("Short free-text description of the vendor"),
      category: z.string().optional().describe("Category label (e.g., 'SaaS', 'Infrastructure', 'Consulting')"),
      criticality: z
        .enum(["critical", "high", "medium", "low"])
        .default("medium")
        .describe("Business criticality tier (default 'medium')"),
      status: z
        .enum(["prospect", "active", "inactive", "under_review"])
        .default("prospect")
        .describe("Lifecycle status (default 'prospect')"),
      website: z.string().optional().describe("Vendor website URL"),
      contact_email: z.string().optional().describe("Primary contact email address"),
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
    "scf_update_vendor",
    "Update an existing vendor record (write — editor+ role). Only provided fields are applied.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      name: z.string().optional().describe("New vendor name"),
      description: z.string().optional().describe("New free-text description"),
      category: z.string().optional().describe("New category label"),
      criticality: z.enum(["critical", "high", "medium", "low"]).optional().describe("New criticality tier"),
      status: z.enum(["prospect", "active", "inactive", "under_review"]).optional().describe("New lifecycle status"),
      website: z.string().optional().describe("New website URL"),
      contact_email: z.string().optional().describe("New primary contact email"),
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
    "scf_trigger_vendor_research",
    "Queue AI security research for a vendor (write — editor+ role, async). Checks HIBP breach data, NVD vulnerabilities, and public posture. Returns a task ID; poll scf_get_vendor_research.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      domain_override: z
        .string()
        .optional()
        .describe("Override the vendor's website domain used for research lookup (e.g., 'example.com')"),
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
    "scf_get_vendor_research",
    "Get the latest vendor research result: breach history, known vulnerabilities, and security posture analysis. Poll this after scf_trigger_vendor_research.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
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
    "scf_trigger_vendor_assessment",
    "Queue an AI vendor security assessment (write — editor+ role, async, HTTP 202). Replaces the deprecated DPSIA trigger. Returns assessment_id + job_id; poll scf_get_vendor_assessment_status.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      services_used: z
        .string()
        .max(2000)
        .optional()
        .describe(
          "Description of services the vendor provides, 1–2000 chars (auto-derived from the vendor record if omitted)",
        ),
      assessment_type: z
        .enum(["initial", "annual", "adhoc"])
        .optional()
        .default("initial")
        .describe("Assessment type: 'initial', 'annual', or 'adhoc' (default 'initial')"),
      data_role: z
        .enum(["Processor", "Controller", "Joint Controller"])
        .optional()
        .default("Processor")
        .describe("GDPR data role (default 'Processor')"),
      additional_context: z
        .string()
        .max(5000)
        .optional()
        .describe("Free-text context, scope notes, or specific concerns to feed the assessor (max 5000 chars)"),
    },
    async ({ org_id, vendor_id, services_used, assessment_type, data_role, additional_context }) => {
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
          assessment_type: assessment_type || "initial",
          data_role: data_role || "Processor",
        };
        if (additional_context) body.additional_context = additional_context;

        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/assessments`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_vendor_assessments",
    "List a vendor's AI security assessments, newest first. Includes status, RAG rating, recommendation, and report fields per record.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}/assessments`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_latest_vendor_assessment",
    "Get a vendor's latest completed AI security assessment: RAG status, recommendation, executive summary, report_markdown/report_json. 404 if none completed yet.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
    },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}/assessments/latest`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_vendor_assessment",
    "Get one vendor AI assessment by ID with full detail: services_used, data_role, RAG status, recommendation, full report fields, and research sources.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      assessment_id: z
        .string()
        .uuid()
        .describe("Assessment UUID — obtain from scf_list_vendor_assessments or the trigger response"),
    },
    async ({ org_id, vendor_id, assessment_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}/assessments/${assessment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_vendor_assessment_status",
    "Get the job status of a queued vendor AI assessment: status, started_at, completed_at, error_message. Poll this after scf_trigger_vendor_assessment.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      assessment_id: z.string().uuid().describe("Assessment UUID — returned by scf_trigger_vendor_assessment"),
    },
    async ({ org_id, vendor_id, assessment_id }) => {
      try {
        const client = getClient();
        const data = await client.get(
          `/organizations/${org_id}/vendors/${vendor_id}/assessments/${assessment_id}/status`,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
