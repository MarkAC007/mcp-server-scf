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

function makeMockServer() {
  const tool = vi.fn();
  return { tool } as unknown as McpServer & { tool: ReturnType<typeof vi.fn> };
}

describe("tool registration", () => {
  // Per-domain expected tool counts. If src/tools/*.ts adds/removes tools,
  // bump the number here and in README.md (CI will already catch the README drift).
  const cases: Array<[string, (s: McpServer) => void, number]> = [
    ["catalog", registerCatalogTools, 6],
    ["scoped-controls", registerScopedControlTools, 6],
    ["evidence", registerEvidenceTools, 19],
    ["risk", registerRiskTools, 12],
    ["vendors", registerVendorTools, 7],
    ["organization", registerOrganizationTools, 7],
    ["capabilities", registerCapabilityTools, 9],
    ["webhooks", registerWebhookTools, 6],
  ];

  for (const [name, register, expected] of cases) {
    it(`registers ${expected} tools in ${name}`, () => {
      const server = makeMockServer();
      expect(() => register(server)).not.toThrow();
      expect(server.tool).toHaveBeenCalledTimes(expected);
    });

    it(`every ${name} tool has snake_case name and non-empty description`, () => {
      const server = makeMockServer();
      register(server);
      for (const call of server.tool.mock.calls) {
        const [toolName, description] = call;
        expect(toolName, `tool name ${toolName}`).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(description, `description for ${toolName}`).toBeTypeOf("string");
        expect((description as string).length, `description length for ${toolName}`).toBeGreaterThan(0);
      }
    });
  }

  it("total tool count equals 72", () => {
    const server = makeMockServer();
    for (const [, register] of cases) register(server);
    expect(server.tool).toHaveBeenCalledTimes(72);
  });
});
