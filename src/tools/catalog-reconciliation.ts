import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

const ORG_ID = z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations");

const RUN_ID = z
  .string()
  .uuid()
  .describe("Reconciliation run UUID — obtain from scf_list_reconciliation_runs or scf_preview_catalog_reconciliation");

/**
 * Per-organization catalog reconciliation.
 *
 * When the platform's SCF catalog moves to a new version, an organization does
 * not move with it automatically. It previews the diff, decides what to do with
 * each deprecated control it had scoped — migrate, retain or retire — then
 * applies the run. Every applied run can be rolled back.
 */
export function registerCatalogReconciliationTools(server: McpServer) {
  server.tool(
    "scf_get_catalog_reconciliation_status",
    "Get this organization's catalog position (read — viewer role): its catalog version, the platform's current version, and whether reconciliation is due or in flight. Start here.",
    {
      org_id: ORG_ID,
    },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/catalog-reconciliation/status`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_preview_catalog_reconciliation",
    "Create a reconciliation preview run (write — admin role): what moving to the target catalog version would do to scoped controls, evidence and mappings. Changes nothing until apply.",
    {
      org_id: ORG_ID,
      target_version: z
        .string()
        .optional()
        .describe("Catalog version to reconcile towards; omit to use the platform's current version"),
    },
    async ({ org_id, target_version }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/catalog-reconciliation/preview`, {
          target_version,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_reconciliation_runs",
    "List this organization's catalog reconciliation runs, newest first (read — viewer role), with each run's status and target version.",
    {
      org_id: ORG_ID,
      limit: z.number().int().min(1).max(100).optional().describe("Page size, 1–100 (default 20)"),
      offset: z.number().int().min(0).optional().describe("Rows to skip for pagination (default 0)"),
    },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/catalog-reconciliation/runs`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_reconciliation_run",
    "Get one reconciliation run in detail (read — viewer role): the computed diff, every deprecated entity needing a decision, and the planned action currently recorded against each.",
    {
      org_id: ORG_ID,
      run_id: RUN_ID,
    },
    async ({ org_id, run_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/catalog-reconciliation/runs/${run_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_set_reconciliation_actions",
    "Record decisions for a reconciliation run (write — admin role). REPLACES the run's planned actions, so send the complete list. Each deprecated entity gets migrate, retain or retire_only.",
    {
      org_id: ORG_ID,
      run_id: RUN_ID,
      actions: z
        .array(
          z.object({
            key: z
              .string()
              .describe("Identifier of the deprecated entity this decision is about, as given in the run detail"),
            entity: z
              .enum([
                "controls",
                "domains",
                "evidence",
                "assessment_objectives",
                "capability_themes",
                "framework_mappings",
              ])
              .optional()
              .describe("Entity type the key refers to (default 'controls')"),
            action: z
              .enum(["migrate", "retain", "retire_only"])
              .describe(
                "migrate: move to a successor; retain: keep the deprecated entity scoped; retire_only: drop it",
              ),
            justification: z.string().optional().describe("Why this decision was taken — recorded for audit"),
            successor_scf_id: z
              .string()
              .optional()
              .describe("Successor control identifier — required by apply when action is 'migrate'"),
          }),
        )
        .describe("The complete set of planned actions for this run — partial lists overwrite the rest"),
      confirmed_framework_ids: z
        .array(z.string())
        .optional()
        .describe("On a first reconciliation, the confirmed framework list this organization is scoping to"),
    },
    async ({ org_id, run_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.put(`/organizations/${org_id}/catalog-reconciliation/runs/${run_id}/actions`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_apply_catalog_reconciliation",
    "Apply a previewed reconciliation run (write — admin role). Asynchronous. The run must be 'previewed' and expected_to_version must match, so a stale preview is refused rather than applied.",
    {
      org_id: ORG_ID,
      run_id: RUN_ID,
      expected_to_version: z
        .string()
        .describe("The target catalog version from the run detail — guards against applying a stale preview"),
    },
    async ({ org_id, run_id, expected_to_version }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/catalog-reconciliation/runs/${run_id}/apply`, {
          expected_to_version,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_rollback_catalog_reconciliation",
    "Roll an applied reconciliation run back (destructive write — admin role). Asynchronous, and requires the typed confirmation string the run detail states.",
    {
      org_id: ORG_ID,
      run_id: RUN_ID,
      confirm_text: z.string().describe("The exact confirmation phrase the platform requires for this rollback"),
    },
    async ({ org_id, run_id, confirm_text }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/catalog-reconciliation/runs/${run_id}/rollback`, {
          confirm_text,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_cancel_catalog_reconciliation",
    "Cancel a reconciliation run that has not been applied (write — admin role). The organization stays on its current catalog version.",
    {
      org_id: ORG_ID,
      run_id: RUN_ID,
    },
    async ({ org_id, run_id }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/catalog-reconciliation/runs/${run_id}/cancel`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_get_catalog_changelog",
    "Get this organization's catalog changelog (read — viewer role): what changed across reconciliations, newest first. Answers 'when did this control change, and what did we decide?'",
    {
      org_id: ORG_ID,
      limit: z.number().int().min(1).max(500).optional().describe("Page size, 1–500 (default 50)"),
      offset: z.number().int().min(0).optional().describe("Rows to skip for pagination (default 0)"),
    },
    async ({ org_id, ...params }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/catalog-changelog`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
