import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ExposedTool, Plan, ToolShape } from "./consolidate.js";

/**
 * Progressive disclosure: register every exposed tool, enable only the core groups, and offer
 * `scf_load_tools` to enable the rest on demand. Enabling a tool makes the SDK send
 * `notifications/tools/list_changed`, so a client that honours it re-reads the list; a client that
 * does not can start the server with SCF_LOAD_ALL_TOOLS=true and get the whole surface up front.
 */

export const LOAD_TOOLS_NAME = "scf_load_tools";
export const LOAD_ALL_ENV = "SCF_LOAD_ALL_TOOLS";

export function loadAllFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes)$/i.test((env[LOAD_ALL_ENV] ?? "").trim());
}

export interface RegisteredSurface {
  handles: Map<string, RegisteredTool>;
  byGroup: Map<string, ExposedTool[]>;
  coreGroups: Set<string>;
}

function describeGroup(group: string, plan: Plan, tools: ExposedTool[]): string {
  const names = tools.map((t) => t.name).join(", ");
  return `${group} — ${plan.groups[group]} (${names})`;
}

export function registerExposedTools(
  server: McpServer,
  exposed: ExposedTool[],
  plan: Plan,
  options: { loadAll: boolean },
): RegisteredSurface {
  const coreGroups = new Set(plan.core_groups);
  const handles = new Map<string, RegisteredTool>();
  const byGroup = new Map<string, ExposedTool[]>();

  // Core groups first so tools/list reads in the order a session needs them.
  const ordered = [...exposed].sort((a, b) => Number(coreGroups.has(b.group)) - Number(coreGroups.has(a.group)));
  for (const tool of ordered) {
    const handle = server.tool(tool.name, tool.description, tool.shape, tool.annotations, tool.handler);
    handles.set(tool.name, handle);
    byGroup.set(tool.group, [...(byGroup.get(tool.group) ?? []), tool]);
    if (!options.loadAll && !coreGroups.has(tool.group)) handle.disable();
  }

  const loadable = Object.keys(plan.groups).filter((g) => !coreGroups.has(g));
  const groupDoc = [
    ...loadable.map((g) => describeGroup(g, plan, byGroup.get(g) ?? [])),
    "all — every group above",
    `Already loaded at startup: ${[...coreGroups].join(", ")}.`,
  ].join("\n");

  const shape: ToolShape = {
    groups: z
      .array(z.enum([...loadable, "all"] as unknown as [string, ...string[]]))
      .min(1)
      .describe(groupDoc),
  };
  server.tool(
    LOAD_TOOLS_NAME,
    "Load more SCF tool groups into this session (teams, collaboration, documents, engagements, assurance, catalog-reconciliation, webhooks, journey, or all). Returns the tools now available.",
    shape,
    { title: "Load Tools", readOnlyHint: true },
    async ({ groups }) => {
      const wanted = new Set((groups as string[]).includes("all") ? loadable : (groups as string[]));
      const enabled: Array<{ name: string; description: string; methods: string[] }> = [];
      for (const group of wanted) {
        for (const tool of byGroup.get(group) ?? []) {
          const handle = handles.get(tool.name);
          if (handle && !handle.enabled) handle.enable();
          enabled.push({ name: tool.name, description: tool.description, methods: Object.keys(tool.methods) });
        }
      }
      const text = JSON.stringify(
        {
          loaded_groups: [...wanted],
          tools: enabled,
          note: "These tools are now in the tool list. If your client did not refresh its list, restart the server with SCF_LOAD_ALL_TOOLS=true.",
        },
        null,
        2,
      );
      return { content: [{ type: "text" as const, text }] };
    },
  );

  return { handles, byGroup, coreGroups };
}
