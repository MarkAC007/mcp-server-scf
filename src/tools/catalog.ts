import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerCatalogTools(server: McpServer) {
  server.tool(
    "scf_list_controls",
    "List SCF security controls from the reference catalog. Returns paginated controls with SCF ID, title, description, and mapped frameworks. Filter by domain, framework, or free-text search.",
    {
      search: z.string().optional().describe("Free-text filter applied to control title and description"),
      domain: z
        .string()
        .optional()
        .describe("SCF domain code (e.g., 'GOV', 'AST', 'IAC') — obtain from scf_list_domains"),
      framework: z
        .string()
        .optional()
        .describe("Framework slug (e.g., 'nist-800-53', 'iso-27001') — obtain from scf_list_frameworks"),
      limit: z.number().int().min(1).max(100).default(25).describe("Page size (1–100, default 25)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset — number of results to skip (default 0)"),
      include_deprecated: z
        .boolean()
        .optional()
        .describe(
          "Include catalog rows deprecated by a later SCF version. Default false — the catalog answers with active rows only, and deprecated rows carry a lifecycle badge when included.",
        ),
    },
    { title: "List SCF Controls", readOnlyHint: true },
    async ({ search, domain, framework, limit, offset, include_deprecated }) => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/controls", {
          search,
          domain,
          framework,
          limit,
          offset,
          include_deprecated,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_control",
    "Get a single SCF control by ID. Returns description, mapped frameworks, assessment objectives, and linked evidence items from the reference catalog.",
    {
      scf_id: z.string().describe("SCF control identifier in DOMAIN-NN format (e.g., 'AST-01', 'IAC-15', 'GOV-02')"),
    },
    { title: "Get SCF Control", readOnlyHint: true },
    async ({ scf_id }) => {
      try {
        const client = getClient();
        const [control, objectives, evidence] = await Promise.all([
          client.get(`/catalog/controls/${scf_id}`),
          client.get(`/catalog/controls/${scf_id}/assessment-objectives`).catch(() => []),
          client.get(`/catalog/controls/${scf_id}/evidence`).catch(() => []),
        ]);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ control, assessment_objectives: objectives, evidence_items: evidence }, null, 2),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_frameworks",
    "List every compliance framework mapped in the SCF catalog (NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR, and 350+ more). Returns framework identifiers and display names.",
    {},
    { title: "List Frameworks", readOnlyHint: true },
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/frameworks");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_domains",
    "List every compliance domain in the SCF taxonomy. Domains group related controls (e.g., GOV = Governance, AST = Asset Management, IAC = Identity & Access Control).",
    {
      include_deprecated: z
        .boolean()
        .optional()
        .describe(
          "Include catalog rows deprecated by a later SCF version. Default false — the catalog answers with active rows only, and deprecated rows carry a lifecycle badge when included.",
        ),
    },
    { title: "List Domains", readOnlyHint: true },
    async ({ include_deprecated }) => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/domains", { include_deprecated });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_evidence_catalog",
    "List evidence items from the SCF reference catalog — the 272 standard evidence types that can be collected to demonstrate control implementation. Supports free-text search and pagination.",
    {
      search: z.string().optional().describe("Free-text filter applied to evidence title and description"),
      limit: z.number().int().min(1).max(100).default(25).describe("Page size (1–100, default 25)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset — number of results to skip (default 0)"),
      include_deprecated: z
        .boolean()
        .optional()
        .describe(
          "Include catalog rows deprecated by a later SCF version. Default false — the catalog answers with active rows only, and deprecated rows carry a lifecycle badge when included.",
        ),
    },
    { title: "List Evidence Catalog", readOnlyHint: true },
    async ({ search, limit, offset, include_deprecated }) => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/evidence", { search, limit, offset, include_deprecated });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_assessment_objectives",
    "List SCF assessment objectives — the 5,736 test criteria used to evaluate control implementation. Optionally filter by control ID; supports free-text search and pagination.",
    {
      control_id: z
        .string()
        .optional()
        .describe("Limit to one SCF control in DOMAIN-NN format (e.g., 'GOV-01', 'AST-02')"),
      search: z.string().optional().describe("Free-text filter applied to objective text"),
      limit: z.number().int().min(1).max(100).default(25).describe("Page size (1–100, default 25)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset — number of results to skip (default 0)"),
      include_deprecated: z
        .boolean()
        .optional()
        .describe(
          "Include catalog rows deprecated by a later SCF version. Default false — the catalog answers with active rows only, and deprecated rows carry a lifecycle badge when included.",
        ),
    },
    { title: "List Assessment Objectives", readOnlyHint: true },
    async ({ control_id, search, limit, offset, include_deprecated }) => {
      try {
        const client = getClient();
        const path = control_id
          ? `/catalog/controls/${control_id}/assessment-objectives`
          : "/catalog/assessment-objectives";
        const data = await client.get(path, { search, limit, offset, include_deprecated });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
