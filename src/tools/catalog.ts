import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

export function registerCatalogTools(server: McpServer) {
  server.tool(
    "list_controls",
    "List SCF security controls. Returns paginated controls with SCF ID, title, description, and mapped frameworks. Use framework filter to find controls for specific standards (NIST 800-53, ISO 27001, SOC 2, etc.).",
    {
      search: z.string().optional().describe("Search term to filter controls by title or description"),
      domain: z.string().optional().describe("Filter by compliance domain identifier"),
      framework: z.string().optional().describe("Filter by framework (e.g., 'nist-800-53', 'iso-27001')"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ search, domain, framework, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get("/controls", { search, domain, framework, page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "get_control",
    "Get detailed information about a specific SCF control by its ID (e.g., AST-01, IAC-15). Returns control description, assessment objectives, mapped frameworks, and linked evidence items.",
    {
      scf_id: z.string().describe("The SCF control identifier (e.g., 'AST-01', 'IAC-15')"),
    },
    async ({ scf_id }) => {
      try {
        const client = getClient();
        const [control, objectives, evidence] = await Promise.all([
          client.get(`/controls/${scf_id}`),
          client.get(`/controls/${scf_id}/assessment-objectives`).catch(() => []),
          client.get(`/controls/${scf_id}/evidence`).catch(() => []),
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
    "List all compliance frameworks mapped in the SCF catalog. Includes NIST 800-53, ISO 27001, SOC 2, FedRAMP, GDPR, and 350+ other frameworks.",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/frameworks");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_domains",
    "List all compliance domains in the SCF taxonomy. Domains group related security controls (e.g., Asset Management, Identity & Access Control).",
    {},
    async () => {
      try {
        const client = getClient();
        const data = await client.get("/domains");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_evidence_catalog",
    "List evidence items from the SCF catalog. These are the 272 standard evidence types that can be collected to demonstrate control implementation.",
    {
      search: z.string().optional().describe("Search term to filter evidence items"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ search, page, per_page }) => {
      try {
        const client = getClient();
        const data = await client.get("/evidence", { search, page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "list_assessment_objectives",
    "List assessment objectives from the SCF catalog. These are the 5,736 specific test criteria used to evaluate control implementation.",
    {
      control_id: z.string().optional().describe("Filter by SCF control ID"),
      page: z.number().min(1).default(1).describe("Page number"),
      per_page: z.number().min(1).max(100).default(25).describe("Results per page"),
    },
    async ({ control_id, page, per_page }) => {
      try {
        const client = getClient();
        const path = control_id ? `/controls/${control_id}/assessment-objectives` : "/assessment-objectives";
        const data = await client.get(path, { page, per_page });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
