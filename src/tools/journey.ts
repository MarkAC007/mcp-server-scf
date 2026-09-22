import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../lib/api-client.js";
import { errorResult } from "../lib/errors.js";

// One stage of an uploaded journey artefact. The platform authors the route
// outside the product and stores what was uploaded for a single organization —
// this is never treated as product content, so the shape stays permissive.
const StageSpec = z.object({
  key: z.string().min(1).max(100).describe("Stable stage identifier, unique within the journey (e.g. 'scoping')"),
  title: z.string().min(1).max(255).describe("Stage name as the organization should read it"),
  summary: z.string().optional().describe("What this stage covers, in the practitioner's words"),
  expect_next: z.string().optional().describe("What the organization should expect once this stage passes"),
  precondition_spec: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe("Machine-checked preconditions evaluated for display only — they never advance a stage on their own"),
});

export function registerJourneyTools(server: McpServer) {
  server.tool(
    "scf_get_journey",
    "Get the organization's guided journey — the staged path it walks, with preconditions evaluated (read — viewer role). Never writes: an org without a journey sees the default template as a preview.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "Get Journey", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/journey`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_list_journey_templates",
    "List the journey templates this deployment ships (read — viewer role). Use the returned template_key with scf_import_journey; a self-hosted deployment may carry a different set than another.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
    },
    { title: "List Journey Templates", readOnlyHint: true },
    async ({ org_id }) => {
      try {
        const client = getClient();
        const data = await client.get(`/organizations/${org_id}/journey/templates`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_import_journey",
    "Create or REPLACE the org's journey from a template (write — editor+). Replaces any existing path, losing its attestations — check scf_get_journey first. An uploaded `template` wins over template_key.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      template_key: z
        .string()
        .min(1)
        .max(100)
        // The server resolves this against a template file on disk and refuses
        // anything path-shaped with a 422 before the service sees it. Constrain
        // it here too so the refusal is legible at the tool boundary rather
        // than arriving as an opaque validation error.
        .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Bare filename stem only — no slashes, no path traversal")
        .optional()
        .describe(
          "Template to import, e.g. 'compliancegenie-default' — obtain from scf_list_journey_templates. Ignored when `template` is supplied.",
        ),
      activate: z.boolean().default(false).describe("Start the first stage immediately (default false)"),
      practitioner_name: z
        .string()
        .optional()
        .describe("The consultancy or practitioner recorded as having set this journey up"),
      template: z
        .object({
          template_key: z.string().max(100).optional().describe("Key identifying the uploaded artefact"),
          template_version: z
            .string()
            .max(50)
            .optional()
            .describe("Version of the artefact, as the practitioner tracks it"),
          name: z
            .string()
            .max(255)
            .optional()
            .describe("Journey name shown to the organization (default 'Compliance journey')"),
          description: z.string().optional().describe("What this journey is for"),
          stages: z.array(StageSpec).min(1).describe("The ordered stages — at least one"),
        })
        .optional()
        .describe(
          "A practitioner-authored journey artefact to upload. When present it wins over template_key entirely.",
        ),
    },
    { title: "Import Journey", readOnlyHint: false, destructiveHint: true },
    async ({ org_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/journey/import`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    "scf_attest_journey_stage",
    "Pass a journey stage by named attestation (write — editor+). The ONLY way a stage passes — nothing advances on computed evidence — and who attested is recorded. A conditional pass needs target_date.",
    {
      org_id: z.string().uuid().describe("Organization UUID — obtain from scf_list_organizations"),
      stage_id: z.string().uuid().describe("Journey stage UUID — obtain from scf_get_journey"),
      note: z.string().optional().describe("What was checked, and by whom, in the attester's own words"),
      conditional: z
        .boolean()
        .default(false)
        .describe("Pass with named items still outstanding (default false). Requires target_date."),
      target_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date, YYYY-MM-DD")
        .optional()
        .describe("When outstanding items are due (YYYY-MM-DD) — required when conditional is true"),
    },
    { title: "Attest Journey Stage", readOnlyHint: false, destructiveHint: false },
    async ({ org_id, stage_id, ...body }) => {
      try {
        const client = getClient();
        const data = await client.post(`/organizations/${org_id}/journey/stages/${stage_id}/attest`, body);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
