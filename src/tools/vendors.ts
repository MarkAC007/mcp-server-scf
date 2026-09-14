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
    { title: "List Vendors", readOnlyHint: true },
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
    { title: "Get Vendor", readOnlyHint: true },
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
    { title: "Create Vendor", readOnlyHint: false, destructiveHint: false },
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
    { title: "Update Vendor", readOnlyHint: false, destructiveHint: false },
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
    { title: "Trigger Vendor Research", readOnlyHint: false, destructiveHint: false },
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
    { title: "Get Vendor Research", readOnlyHint: true },
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
    { title: "Trigger Vendor Assessment", readOnlyHint: false, destructiveHint: false },
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
    { title: "List Vendor Assessments", readOnlyHint: true },
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
    { title: "Get Latest Vendor Assessment", readOnlyHint: true },
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
    { title: "Get Vendor Assessment", readOnlyHint: true },
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
    { title: "Get Vendor Assessment Status", readOnlyHint: true },
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

  // ===========================================================================
  // Vendor Certifications
  // ===========================================================================

  server.tool(
    "scf_list_vendor_certifications",
    "List a vendor's certifications (read — viewer role): name, issuing body, certificate number, status, issue and expiry dates, scope and verification URL.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
    },
    { title: "List Vendor Certifications", readOnlyHint: true },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}/certifications`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_vendor_certification",
    "Record a certification a vendor holds (write — editor role), e.g. ISO 27001 or SOC 2 Type II. Status defaults to valid; track expiry_date so renewals surface.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      certification_name: z.string().min(1).max(255).describe("Certification name, e.g. 'ISO 27001:2022'"),
      certification_body: z.string().optional().describe("Issuing body"),
      certificate_number: z.string().optional().describe("Certificate number"),
      status: z.enum(["valid", "expired", "revoked", "pending"]).optional().describe("Status (default valid)"),
      issue_date: z.string().optional().describe("YYYY-MM-DD"),
      expiry_date: z.string().optional().describe("YYYY-MM-DD"),
      scope: z.string().optional().describe("Certification scope statement"),
      verification_url: z.string().optional().describe("Public verification URL"),
    },
    { title: "Create Vendor Certification", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, vendor_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/certifications`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_vendor_certification",
    "Update a vendor certification (write — editor role). Only passed fields change; use it to mark a certificate expired or revoked, or to record the renewed expiry date.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      cert_id: z.string().uuid().describe("Certification UUID — obtain from scf_list_vendor_certifications"),
      certification_name: z.string().min(1).max(255).optional().describe("Certification name, e.g. 'ISO 27001:2022'"),
      certification_body: z.string().optional().describe("Issuing body"),
      certificate_number: z.string().optional().describe("Certificate number"),
      status: z.enum(["valid", "expired", "revoked", "pending"]).optional().describe("Status"),
      issue_date: z.string().optional().describe("YYYY-MM-DD"),
      expiry_date: z.string().optional().describe("YYYY-MM-DD"),
      scope: z.string().optional().describe("Certification scope statement"),
      verification_url: z.string().optional().describe("Public verification URL"),
    },
    { title: "Update Vendor Certification", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, vendor_id, cert_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.patch(
          `/organizations/${org_id}/vendors/${vendor_id}/certifications/${cert_id}`,
          body,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_vendor_certification",
    "Delete a vendor certification record (destructive write — editor role). Prefer status=expired or revoked when the history matters.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      cert_id: z.string().uuid().describe("Certification UUID — obtain from scf_list_vendor_certifications"),
    },
    { title: "Delete Vendor Certification", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, vendor_id, cert_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/vendors/${vendor_id}/certifications/${cert_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ===========================================================================
  // Vendor Action Items
  // ===========================================================================

  server.tool(
    "scf_list_vendor_action_items",
    "List remediation action items for one vendor, or across every vendor when vendor_id is omitted (read — viewer role). Filter by status or priority.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().optional().describe("Vendor UUID — omit to list action items across all vendors"),
      status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional().describe("Filter by status"),
      priority: z.enum(["critical", "high", "medium", "low"]).optional().describe("Filter by priority"),
    },
    { title: "List Vendor Action Items", readOnlyHint: true },
    async ({ org_id, vendor_id, status, priority }) => {
      try {
        const client = getClient();
        const path = vendor_id
          ? `/organizations/${org_id}/vendors/${vendor_id}/action-items`
          : `/organizations/${org_id}/vendor-action-items`;
        const data = await client.get(path, { status, priority });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_vendor_action_item",
    "Create a remediation action item against a vendor (write — editor role), typically from an assessment finding. Priority defaults to medium, status to open.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      title: z.string().min(1).max(255).describe("Action item title"),
      description: z.string().optional().describe("Action item detail"),
      priority: z.enum(["critical", "high", "medium", "low"]).optional().describe("Priority (default medium)"),
      status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional().describe("Status (default open)"),
      category: z.string().optional().describe("Free-text category, e.g. 'contractual', 'technical'"),
      owner_name: z.string().optional().describe("Owner name"),
      owner_user_id: z.string().uuid().optional().describe("Owner — obtain from scf_list_members"),
      due_date: z.string().optional().describe("YYYY-MM-DD"),
      completed_date: z.string().optional().describe("YYYY-MM-DD"),
    },
    { title: "Create Vendor Action Item", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, vendor_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/action-items`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_vendor_action_item",
    "Update a vendor action item (write — editor role). Only passed fields change; set status=completed with completed_date to close it.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      item_id: z.string().uuid().describe("Action item UUID — obtain from scf_list_vendor_action_items"),
      title: z.string().min(1).max(255).optional().describe("Action item title"),
      description: z.string().optional().describe("Action item detail"),
      priority: z.enum(["critical", "high", "medium", "low"]).optional().describe("Priority"),
      status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional().describe("Status"),
      category: z.string().optional().describe("Free-text category, e.g. 'contractual', 'technical'"),
      owner_name: z.string().optional().describe("Owner name"),
      owner_user_id: z.string().uuid().optional().describe("Owner — obtain from scf_list_members"),
      due_date: z.string().optional().describe("YYYY-MM-DD"),
      completed_date: z.string().optional().describe("YYYY-MM-DD"),
    },
    { title: "Update Vendor Action Item", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, vendor_id, item_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.patch(`/organizations/${org_id}/vendors/${vendor_id}/action-items/${item_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_vendor_action_item",
    "Delete a vendor action item (destructive write — editor role). Prefer status=cancelled when the record should stay visible.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      item_id: z.string().uuid().describe("Action item UUID — obtain from scf_list_vendor_action_items"),
    },
    { title: "Delete Vendor Action Item", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, vendor_id, item_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(`/organizations/${org_id}/vendors/${vendor_id}/action-items/${item_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ===========================================================================
  // Compensating Controls
  // ===========================================================================

  server.tool(
    "scf_list_compensating_controls",
    "List the compensating controls recorded against a vendor's gaps (read — viewer role): the gap, the control that offsets it, its effectiveness rating and risk-reduction notes.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
    },
    { title: "List Compensating Controls", readOnlyHint: true },
    async ({ org_id, vendor_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/vendors/${vendor_id}/compensating-controls`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_create_compensating_control",
    "Record a compensating control for a vendor gap (write — editor role): what the gap is, what offsets it, and how effective that is (full, partial or minimal — default partial).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      gap_description: z.string().min(1).describe("The gap the control offsets"),
      compensating_control: z.string().min(1).describe("The control that offsets the gap"),
      effectiveness_rating: z
        .enum(["full", "partial", "minimal"])
        .optional()
        .describe("Effectiveness (default partial)"),
      risk_reduction_notes: z.string().optional().describe("How much residual risk this removes"),
    },
    { title: "Create Compensating Control", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, vendor_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.post(`/organizations/${org_id}/vendors/${vendor_id}/compensating-controls`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_update_compensating_control",
    "Update a vendor compensating control (write — editor role). Only passed fields change: gap description, control text, effectiveness rating, risk-reduction notes.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      cc_id: z.string().uuid().describe("Compensating control UUID — obtain from scf_list_compensating_controls"),
      gap_description: z.string().min(1).optional().describe("The gap the control offsets"),
      compensating_control: z.string().min(1).optional().describe("The control that offsets the gap"),
      effectiveness_rating: z
        .enum(["full", "partial", "minimal"])
        .optional()
        .describe("Effectiveness (default partial)"),
      risk_reduction_notes: z.string().optional().describe("How much residual risk this removes"),
    },
    { title: "Update Compensating Control", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, vendor_id, cc_id, ...fields }) => {
      try {
        const client = getClient();
        const body = fields;
        const data = await client.patch(
          `/organizations/${org_id}/vendors/${vendor_id}/compensating-controls/${cc_id}`,
          body,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_delete_compensating_control",
    "Delete a vendor compensating control record (destructive write — editor role).",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      vendor_id: z.string().uuid().describe("Vendor UUID — obtain from scf_list_vendors"),
      cc_id: z.string().uuid().describe("Compensating control UUID — obtain from scf_list_compensating_controls"),
    },
    { title: "Delete Compensating Control", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, vendor_id, cc_id }) => {
      try {
        const client = getClient();
        const data = await client.delete(
          `/organizations/${org_id}/vendors/${vendor_id}/compensating-controls/${cc_id}`,
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
