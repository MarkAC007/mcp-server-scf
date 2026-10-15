import { describe, it, expect } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SYSTEM_TYPES, SYSTEM_TYPES_PROSE } from "../src/lib/system-types.js";
import { VENDOR_STATUSES, VENDOR_STATUSES_PROSE } from "../src/lib/vendor-statuses.js";
import { registerCapabilityTools } from "../src/tools/capabilities.js";
import { registerVendorTools } from "../src/tools/vendors.js";
import {
  DATA_CLASSIFICATIONS,
  DATA_CLASSIFICATIONS_PROSE,
  SYSTEM_CRITICALITIES,
  SYSTEM_CRITICALITIES_PROSE,
} from "../src/lib/system-ratings.js";
import {
  DEFICIENCY_PRIORITIES,
  DEFICIENCY_PRIORITIES_PROSE,
  DEFICIENCY_STATUSES,
  DEFICIENCY_STATUSES_PROSE,
} from "../src/lib/deficiencies.js";
import { EFFECTIVENESS_RATINGS, EFFECTIVENESS_RATINGS_PROSE } from "../src/lib/effectiveness-ratings.js";
import {
  CAPABILITY_TEST_RESULTS,
  CAPABILITY_TEST_RESULTS_PROSE,
  CAPABILITY_TEST_TYPES,
  CAPABILITY_TEST_TYPES_PROSE,
} from "../src/lib/capability-tests.js";
import { registerAssuranceTools } from "../src/tools/assurance.js";
import fixture from "./fixtures/platform-vocabularies.json" with { type: "json" };

type Shape = Record<string, z.ZodTypeAny>;

/** Register a tool module against a stub server and return each tool's description and input shape. */
function schemasOf(register: (s: McpServer) => void): Map<string, { description: string; shape: Shape }> {
  const map = new Map<string, { description: string; shape: Shape }>();
  const server = {
    tool: (name: string, description: string, shape: Shape) => map.set(name, { description, shape }),
  };
  register(server as unknown as McpServer);
  return map;
}

/** `^(a|b|c)$` → ["a", "b", "c"], sorted: membership is what matters, the platform may reorder. */
const fromPattern = (p: string) => p.replace(/^\^\(/, "").replace(/\)\$$/, "").split("|").sort();

const enumOptions = (s: z.ZodTypeAny): string[] => {
  let inner = s;
  while (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault || inner instanceof z.ZodNullable)
    inner = inner.unwrap();
  return [...(inner as z.ZodEnum<Record<string, string>>).options].sort();
};

const ORG = "8a6c1d8e-3d1a-4c25-9c5c-8f2c8b2d6e11";

// One case per row of VOCABULARIES in scripts/api-coverage.mjs. Adding a vocabulary means adding a row here too.
const cases = [
  {
    key: "system_type" as const,
    values: SYSTEM_TYPES,
    prose: SYSTEM_TYPES_PROSE,
    tools: schemasOf(registerCapabilityTools),
    sites: [
      ["scf_create_system", "system_type"],
      ["scf_update_system", "system_type"],
    ],
    parseTool: "scf_create_system",
    accepted: { org_id: ORG, name: "HRIS", system_type: "hr_system" },
    rejected: { org_id: ORG, name: "Mainframe", system_type: "mainframe" },
  },
  {
    key: "vendor_status" as const,
    values: VENDOR_STATUSES,
    prose: VENDOR_STATUSES_PROSE,
    tools: schemasOf(registerVendorTools),
    sites: [
      ["scf_list_vendors", "status"],
      ["scf_create_vendor", "status"],
      ["scf_update_vendor", "status"],
    ],
    parseTool: "scf_create_vendor",
    accepted: { org_id: ORG, name: "Acme", status: "offboarded" },
    rejected: { org_id: ORG, name: "Acme", status: "inactive" },
  },
  {
    key: "system_criticality" as const,
    values: SYSTEM_CRITICALITIES,
    prose: SYSTEM_CRITICALITIES_PROSE,
    tools: schemasOf(registerCapabilityTools),
    sites: [
      ["scf_create_system", "criticality"],
      ["scf_update_system", "criticality"],
    ],
    parseTool: "scf_create_system",
    accepted: { org_id: ORG, name: "HRIS", system_type: "hr_system", criticality: "critical" },
    rejected: { org_id: ORG, name: "HRIS", system_type: "hr_system", criticality: "tier1" },
  },
  {
    key: "data_classification" as const,
    values: DATA_CLASSIFICATIONS,
    prose: DATA_CLASSIFICATIONS_PROSE,
    tools: schemasOf(registerCapabilityTools),
    sites: [
      ["scf_create_system", "data_classification"],
      ["scf_update_system", "data_classification"],
    ],
    parseTool: "scf_create_system",
    accepted: { org_id: ORG, name: "HRIS", system_type: "hr_system", data_classification: "restricted" },
    rejected: { org_id: ORG, name: "HRIS", system_type: "hr_system", data_classification: "secret" },
  },
  {
    key: "deficiency_priority" as const,
    values: DEFICIENCY_PRIORITIES,
    prose: DEFICIENCY_PRIORITIES_PROSE,
    tools: schemasOf(registerAssuranceTools),
    sites: [
      ["scf_create_deficiency", "priority"],
      ["scf_update_deficiency", "priority"],
    ],
    parseTool: "scf_create_deficiency",
    accepted: { org_id: ORG, title: "Gap", risk_code: "R-ORG-1", priority: "critical" },
    rejected: { org_id: ORG, title: "Gap", risk_code: "R-ORG-1", priority: "urgent" },
  },
  {
    key: "deficiency_status" as const,
    values: DEFICIENCY_STATUSES,
    prose: DEFICIENCY_STATUSES_PROSE,
    tools: schemasOf(registerAssuranceTools),
    sites: [
      ["scf_list_deficiencies", "status"],
      ["scf_update_deficiency", "status"],
    ],
    parseTool: "scf_update_deficiency",
    accepted: { org_id: ORG, deficiency_id: ORG, status: "cancelled" },
    rejected: { org_id: ORG, deficiency_id: ORG, status: "closed" },
  },
  {
    key: "effectiveness_rating" as const,
    values: EFFECTIVENESS_RATINGS,
    prose: EFFECTIVENESS_RATINGS_PROSE,
    tools: schemasOf(registerAssuranceTools),
    sites: [
      ["scf_create_org_compensating_control", "effectiveness_rating"],
      ["scf_update_org_compensating_control", "effectiveness_rating"],
    ],
    parseTool: "scf_update_org_compensating_control",
    accepted: { org_id: ORG, cc_id: ORG, effectiveness_rating: "minimal" },
    rejected: { org_id: ORG, cc_id: ORG, effectiveness_rating: "none" },
  },
  {
    key: "capability_test_type" as const,
    values: CAPABILITY_TEST_TYPES,
    prose: CAPABILITY_TEST_TYPES_PROSE,
    tools: schemasOf(registerAssuranceTools),
    sites: [
      ["scf_list_capability_tests", "test_type"],
      ["scf_create_capability_test", "test_type"],
      ["scf_update_capability_test", "test_type"],
    ],
    parseTool: "scf_update_capability_test",
    accepted: { org_id: ORG, test_id: ORG, test_type: "continuity" },
    rejected: { org_id: ORG, test_id: ORG, test_type: "pentest" },
  },
  {
    key: "capability_test_result" as const,
    values: CAPABILITY_TEST_RESULTS,
    prose: CAPABILITY_TEST_RESULTS_PROSE,
    tools: schemasOf(registerAssuranceTools),
    sites: [
      ["scf_create_capability_test", "result"],
      ["scf_update_capability_test", "result"],
    ],
    parseTool: "scf_update_capability_test",
    accepted: { org_id: ORG, test_id: ORG, result: "passed_with_findings" },
    rejected: { org_id: ORG, test_id: ORG, result: "partial" },
  },
];

describe.each(cases)("$key vocabulary matches the platform", (c) => {
  const platform = fromPattern(fixture.patterns[c.key].pattern);

  it("the exported const has exactly the platform's values", () => {
    expect([...c.values].sort()).toEqual(platform);
  });

  it.each(c.sites)("%s.%s exposes exactly the platform's values", (tool, param) => {
    expect(enumOptions(c.tools.get(tool)!.shape[param])).toEqual(platform);
  });

  it.each(c.sites)("%s.%s prose names every value so the model never guesses from a stale list", (tool, param) => {
    const desc = c.tools.get(tool)!.shape[param].description ?? "";
    expect(desc).toContain(c.prose);
    for (const v of platform) expect(desc).toContain(v);
  });

  it("the schema accepts a platform value and rejects a foreign one", () => {
    const schema = z.object(c.tools.get(c.parseTool)!.shape);
    expect(schema.safeParse(c.accepted).success).toBe(true);
    expect(schema.safeParse(c.rejected).success).toBe(false);
  });
});
