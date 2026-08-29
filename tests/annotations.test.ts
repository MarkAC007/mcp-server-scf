import { describe, it, expect, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerCatalogTools } from "../src/tools/catalog.js";
import { registerScopedControlTools } from "../src/tools/scoped-controls.js";
import { registerEvidenceTools } from "../src/tools/evidence.js";
import { registerRiskTools } from "../src/tools/risk.js";
import { registerVendorTools } from "../src/tools/vendors.js";
import { registerOrganizationTools } from "../src/tools/organization.js";
import { registerCapabilityTools } from "../src/tools/capabilities.js";
import { registerWebhookTools } from "../src/tools/webhooks.js";
import { registerDocumentTools } from "../src/tools/documents.js";
import { registerEngagementTools } from "../src/tools/engagements.js";
import { registerCatalogReconciliationTools } from "../src/tools/catalog-reconciliation.js";
import { registerCdmTools } from "../src/tools/cdm.js";

function makeMockServer() {
  const tool = vi.fn();
  return { tool } as unknown as McpServer & { tool: ReturnType<typeof vi.fn> };
}

interface ToolAnnotations {
  title?: unknown;
  readOnlyHint?: unknown;
  destructiveHint?: unknown;
}

const registrars: Array<[string, (s: McpServer) => void]> = [
  ["catalog", registerCatalogTools],
  ["scoped-controls", registerScopedControlTools],
  ["evidence", registerEvidenceTools],
  ["risk", registerRiskTools],
  ["vendors", registerVendorTools],
  ["organization", registerOrganizationTools],
  ["capabilities", registerCapabilityTools],
  ["webhooks", registerWebhookTools],
  ["documents", registerDocumentTools],
  ["engagements", registerEngagementTools],
  ["catalog-reconciliation", registerCatalogReconciliationTools],
  ["cdm", registerCdmTools],
];

function collectCalls(register: (s: McpServer) => void) {
  const server = makeMockServer();
  register(server);
  return server.tool.mock.calls;
}

describe("tool annotations", () => {
  for (const [name, register] of registrars) {
    it(`every ${name} tool has annotations with a non-empty title and a boolean readOnlyHint`, () => {
      for (const call of collectCalls(register)) {
        const toolName = call[0] as string;
        // server.tool(name, description, schema, annotations, handler)
        const annotations = call[3] as ToolAnnotations | undefined;
        expect(annotations, `annotations for ${toolName} (4th arg)`).toBeTypeOf("object");
        expect(annotations, `annotations for ${toolName} (4th arg)`).not.toBeNull();
        expect(annotations!.title, `title for ${toolName}`).toBeTypeOf("string");
        expect((annotations!.title as string).length, `title length for ${toolName}`).toBeGreaterThan(0);
        expect(annotations!.readOnlyHint, `readOnlyHint for ${toolName}`).toBeTypeOf("boolean");
      }
    });

    it(`every ${name} delete/remove tool has destructiveHint === true`, () => {
      for (const call of collectCalls(register)) {
        const toolName = call[0] as string;
        if (!/^scf_(delete|remove)_/.test(toolName)) continue;
        const annotations = call[3] as ToolAnnotations | undefined;
        expect(annotations?.destructiveHint, `destructiveHint for ${toolName}`).toBe(true);
      }
    });
  }
});
