#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCatalogTools } from "./tools/catalog.js";
import { registerScopedControlTools } from "./tools/scoped-controls.js";
import { registerEvidenceTools } from "./tools/evidence.js";
import { registerRiskTools } from "./tools/risk.js";
import { registerVendorTools } from "./tools/vendors.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerCapabilityTools } from "./tools/capabilities.js";

const server = new McpServer({
  name: "mcp-server-scf",
  version: "0.1.0",
});

// Register all tool groups
registerCatalogTools(server);
registerScopedControlTools(server);
registerEvidenceTools(server);
registerRiskTools(server);
registerVendorTools(server);
registerOrganizationTools(server);
registerCapabilityTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SCF MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
