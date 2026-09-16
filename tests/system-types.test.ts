import { describe, it, expect } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SYSTEM_TYPES, SYSTEM_TYPES_PROSE } from "../src/lib/system-types.js";
import { registerCapabilityTools } from "../src/tools/capabilities.js";
import fixture from "./fixtures/platform-system-type-pattern.json" with { type: "json" };

type Shape = Record<string, z.ZodTypeAny>;

/** Register the capability tools and return each tool's description and input shape. */
function schemasOf(): Map<string, { description: string; shape: Shape }> {
  const map = new Map<string, { description: string; shape: Shape }>();
  const server = {
    tool: (name: string, description: string, shape: Shape) => map.set(name, { description, shape }),
  };
  registerCapabilityTools(server as unknown as McpServer);
  return map;
}

/** `^(a|b|c)$` → ["a", "b", "c"] */
const fromPattern = (p: string) => p.replace(/^\^\(/, "").replace(/\)\$$/, "").split("|");

const enumOptions = (s: z.ZodTypeAny): string[] => {
  const inner = s instanceof z.ZodOptional ? s.unwrap() : s;
  return (inner as z.ZodEnum<Record<string, string>>).options as string[];
};

describe("system_type vocabulary matches the platform", () => {
  const tools = schemasOf();
  const platformTypes = fromPattern(fixture.pattern);

  it("SYSTEM_TYPES equals the platform's SystemCreate.system_type pattern, in order", () => {
    expect([...SYSTEM_TYPES]).toEqual(platformTypes);
  });

  it("scf_create_system exposes exactly the platform's types", () => {
    expect(enumOptions(tools.get("scf_create_system")!.shape.system_type)).toEqual(platformTypes);
  });

  it("scf_update_system exposes exactly the platform's types", () => {
    expect(enumOptions(tools.get("scf_update_system")!.shape.system_type)).toEqual(platformTypes);
  });

  it("the describe() prose names every type so the model never guesses from a stale list", () => {
    for (const name of ["scf_create_system", "scf_update_system"]) {
      const desc = tools.get(name)!.shape.system_type.description ?? "";
      expect(desc).toContain(SYSTEM_TYPES_PROSE);
      for (const t of platformTypes) expect(desc).toContain(t);
    }
  });

  it("accepts a v2 type such as hr_system client-side and still rejects unknown values", () => {
    const schema = z.object(tools.get("scf_create_system")!.shape);
    const org_id = "11111111-1111-4111-8111-111111111111";
    expect(schema.safeParse({ org_id, name: "Workday", system_type: "hr_system" }).success).toBe(true);
    expect(schema.safeParse({ org_id, name: "Workday", system_type: "mainframe" }).success).toBe(false);
  });
});
