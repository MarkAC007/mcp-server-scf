import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerCatalogTools(server: McpServer) {
  server.tool(
    "list_controls",
    "List SCF security controls from the reference catalog. Returns paginated controls with SCF ID, title, description, and mapped frameworks. Use domain or search filters to narrow results. Pagination uses limit/offset.",
    {
      search: z.string().optional().describe("Search term to filter controls by title or description"),
      domain: z.string().optional().describe("Filter by compliance domain identifier (e.g., 'GOV', 'AST', 'IAC')"),
      framework: z.string().optional().describe("Filter by framework (e.g., 'nist-800-53', 'iso-27001')"),
      limit: z.number().min(1).max(100).default(25).describe("Number of results to return (max 100)"),
      offset: z.number().min(0).default(0).describe("Number of results to skip for pagination"),
    },
    async ({ search, domain, framework, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/controls", { search, domain, framework, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_control",
    "Get detailed information about a specific SCF control by its ID (e.g., AST-01, IAC-15, GOV-02). Returns the control description, mapped frameworks, assessment objectives, and linked evidence items from the reference catalog.",
    {
      scf_id: z.string().describe("The SCF control identifier (e.g., 'AST-01', 'IAC-15', 'GOV-02')"),
    },
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
    "list_frameworks",
    "List all compliance frameworks mapped in the SCF catalog. Returns framework identifiers and names. Includes NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR, and 350+ other frameworks.",
    {},
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
    "list_domains",
    "List all compliance domains in the SCF taxonomy. Domains group related security controls (e.g., GOV = Governance, AST = Asset Management, IAC = Identity & Access Control).",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/domains");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_evidence_catalog",
    "List evidence items from the SCF reference catalog. These are the 272 standard evidence types that can be collected to demonstrate control implementation. Pagination uses limit/offset.",
    {
      search: z.string().optional().describe("Search term to filter evidence items by title or description"),
      limit: z.number().min(1).max(100).default(25).describe("Number of results to return (max 100)"),
      offset: z.number().min(0).default(0).describe("Number of results to skip for pagination"),
    },
    async ({ search, limit, offset }) => {
      try {
        const client = getClient();
        const data = await client.get("/catalog/evidence", { search, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_assessment_objectives",
    "List assessment objectives from the SCF reference catalog. These are the 5,736 specific test criteria used to evaluate control implementation. Filter by SCF control ID to get objectives for a specific control. Pagination uses limit/offset.",
    {
      control_id: z.string().optional().describe("Filter by SCF control ID (e.g., 'GOV-01', 'AST-02')"),
      search: z.string().optional().describe("Search term to filter assessment objectives"),
      limit: z.number().min(1).max(100).default(25).describe("Number of results to return (max 100)"),
      offset: z.number().min(0).default(0).describe("Number of results to skip for pagination"),
    },
    async ({ control_id, search, limit, offset }) => {
      try {
        const client = getClient();
        const path = control_id
          ? `/catalog/controls/${control_id}/assessment-objectives`
          : "/catalog/assessment-objectives";
        const data = await client.get(path, { search, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
