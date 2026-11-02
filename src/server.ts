import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCatalogTools } from "./tools/catalog.js";
import { registerScopedControlTools } from "./tools/scoped-controls.js";
import { registerEvidenceTools } from "./tools/evidence.js";
import { registerRiskTools } from "./tools/risk.js";
import { registerVendorTools } from "./tools/vendors.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerCapabilityTools } from "./tools/capabilities.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerEngagementTools } from "./tools/engagements.js";
import { registerCatalogReconciliationTools } from "./tools/catalog-reconciliation.js";
import { registerTeamTools } from "./tools/teams.js";
import { registerCollaborationTools } from "./tools/collaboration.js";
import { registerJourneyTools } from "./tools/journey.js";
import { registerAssuranceTools } from "./tools/assurance.js";
import { ToolCollector, buildExposedTools, type Plan } from "./consolidation/consolidate.js";
import { registerExposedTools, loadAllFromEnv } from "./consolidation/registry.js";
import plan from "./consolidation/plan.json" with { type: "json" };

import { PKG_NAME, PKG_VERSION } from "./lib/version.js";

/** Capture every domain module's tools, then fold them into the consolidated surface. */
export function collectExposedTools() {
  const collector = new ToolCollector();
  const asServer = collector as unknown as McpServer;
  registerCatalogTools(asServer);
  registerScopedControlTools(asServer);
  registerEvidenceTools(asServer);
  registerRiskTools(asServer);
  registerVendorTools(asServer);
  registerOrganizationTools(asServer);
  registerCapabilityTools(asServer);
  registerWebhookTools(asServer);
  registerDocumentTools(asServer);
  registerEngagementTools(asServer);
  registerCatalogReconciliationTools(asServer);
  registerTeamTools(asServer);
  registerCollaborationTools(asServer);
  registerJourneyTools(asServer);
  registerAssuranceTools(asServer);
  return buildExposedTools(collector.tools, plan as Plan);
}

/**
 * @param exposed  A surface from collectExposedTools(). The HTTP transport builds one
 *                 McpServer per request, so it collects once per process and passes it in.
 */
export function createServer(
  options: { loadAll: boolean } = { loadAll: loadAllFromEnv() },
  exposed = collectExposedTools(),
): McpServer {
  const server = new McpServer(
    {
      name: PKG_NAME,
      version: PKG_VERSION,
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
    },
  );
  registerExposedTools(server, exposed, plan as Plan, options);
  return server;
}
