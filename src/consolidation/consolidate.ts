import { z } from "zod";
import { errorResult } from "../lib/errors.js";

/**
 * Consolidation: expose one tool per noun-and-direction whose `method` selects one of the
 * original single-route tools in src/tools/*.ts.
 *
 * The original tools are the unit of implementation and of testing — each still registers
 * through the same `server.tool(name, description, shape, annotations, handler)` call, and the
 * handler tests, the vocabulary drift guard and scripts/api-coverage.mjs keep reading them.
 * What changes is the surface a client sees: `ToolCollector` captures the registrations
 * instead of a live server, and `buildExposedTools` folds them by src/consolidation/plan.json
 * into tools such as `scf_vendor_read` (method: list | get | research | …). A merged tool's
 * input schema is `method` plus the union of its methods' parameters; a parameter required by
 * every method stays required, anything else becomes optional and says which methods use it.
 * On a call the dispatcher re-validates the arguments against the chosen method's own schema
 * (so its defaults and constraints apply unchanged) and hands them to the original handler.
 */

export type ToolShape = Record<string, z.ZodType>;

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

export interface CapturedTool {
  name: string;
  description: string;
  shape: ToolShape;
  annotations: ToolAnnotations;
  handler: ToolHandler;
}

export interface ExposedTool extends CapturedTool {
  group: string;
  /** method → original tool name; a single-method tool is exposed unchanged under its original name. */
  methods: Record<string, string>;
}

export interface PlanTool {
  group: string;
  title?: string;
  description?: string;
  methods: Record<string, string>;
}

export interface Plan {
  core_groups: string[];
  groups: Record<string, string>;
  tools: Record<string, PlanTool>;
}

/** Stands in for an McpServer during registration and records every tool the domain modules define. */
export class ToolCollector {
  readonly tools: CapturedTool[] = [];

  tool(name: string, description: string, shape: ToolShape, annotations: ToolAnnotations, handler: ToolHandler): void {
    this.tools.push({ name, description, shape, annotations, handler });
  }
}

interface FieldUse {
  method: string;
  inner: z.ZodType;
  required: boolean;
  description: string | undefined;
}

/** Strip optional/default wrappers; the method's own schema re-applies them on dispatch. */
function unwrap(type: z.ZodType): { inner: z.ZodType; description: string | undefined } {
  let current: z.ZodType = type;
  let description = type.description;
  for (;;) {
    const def = current.def as { type?: string };
    if (def.type === "optional") {
      current = (current as z.ZodOptional<z.ZodType>).unwrap();
    } else if (def.type === "default") {
      current = (current as z.ZodDefault<z.ZodType>).removeDefault();
    } else {
      return { inner: current, description: description ?? current.description };
    }
    description = description ?? current.description;
  }
}

/** A structural key for a schema so identical parameter types across methods collapse to one. */
function schemaKey(type: z.ZodType): string {
  try {
    const json = z.toJSONSchema(type, { unrepresentable: "any" }) as Record<string, unknown>;
    delete json.description;
    delete json.$schema;
    return JSON.stringify(json);
  } catch {
    return `opaque:${Math.random()}`;
  }
}

function mergeField(name: string, uses: FieldUse[], methodCount: number): z.ZodType {
  const distinct = new Map<string, z.ZodType>();
  for (const use of uses) {
    const key = schemaKey(use.inner);
    if (!distinct.has(key)) distinct.set(key, use.inner);
  }
  const inners = [...distinct.values()];
  let merged: z.ZodType = inners.length === 1 ? inners[0] : z.union(inners as [z.ZodType, z.ZodType, ...z.ZodType[]]);

  const descriptions = new Map<string, string[]>();
  for (const use of uses) {
    const text = use.description ?? name;
    descriptions.set(text, [...(descriptions.get(text) ?? []), use.method]);
  }
  const parts =
    descriptions.size === 1
      ? [[...descriptions.keys()][0]]
      : [...descriptions.entries()].map(([text, methods]) => `${text} [${methods.join(", ")}]`);
  const usedByAll = uses.length === methodCount;
  const requiredByAll = usedByAll && uses.every((u) => u.required);
  const suffix = usedByAll ? "" : ` Used by: ${uses.map((u) => u.method).join(", ")}.`;
  merged = merged.describe(parts.join(" | ") + suffix);
  return requiredByAll ? merged : merged.optional();
}

function buildMergedTool(name: string, spec: PlanTool, originals: Map<string, CapturedTool>): ExposedTool {
  const methodNames = Object.keys(spec.methods);
  const targets = new Map<string, CapturedTool>();
  for (const method of methodNames) {
    const original = originals.get(spec.methods[method]);
    if (!original) throw new Error(`plan: ${name}.${method} names unknown tool ${spec.methods[method]}`);
    targets.set(method, original);
  }
  if (!spec.description) throw new Error(`plan: ${name} needs a description`);

  const fields = new Map<string, FieldUse[]>();
  for (const [method, original] of targets) {
    for (const [field, type] of Object.entries(original.shape)) {
      const { inner, description } = unwrap(type);
      fields.set(field, [...(fields.get(field) ?? []), { method, inner, required: !type.isOptional(), description }]);
    }
  }
  if (fields.has("method")) throw new Error(`plan: ${name} merges a tool that already has a 'method' parameter`);

  const methodDoc = methodNames.map((m) => `${m}: ${targets.get(m)!.description}`).join("\n");
  const shape: ToolShape = {
    method: z.enum(methodNames as [string, ...string[]]).describe(methodDoc),
  };
  for (const [field, uses] of fields) shape[field] = mergeField(field, uses, methodNames.length);

  const handler: ToolHandler = async (args) => {
    const { method, ...rest } = args;
    const target = typeof method === "string" ? targets.get(method) : undefined;
    if (!target) {
      return errorResult(new Error(`${name}: unknown method ${String(method)}; one of ${methodNames.join(", ")}`));
    }
    const parsed = z.object(target.shape).safeParse(rest);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(arguments)"}: ${issue.message}`)
        .join("; ");
      return errorResult(new Error(`${name} method ${String(method)}: ${issues}`));
    }
    return target.handler(parsed.data as Record<string, unknown>);
  };

  const all = [...targets.values()];
  const annotations: ToolAnnotations = {
    title: spec.title ?? name,
    readOnlyHint: all.every((t) => t.annotations.readOnlyHint === true),
  };
  if (all.some((t) => t.annotations.destructiveHint === true)) annotations.destructiveHint = true;
  else if (!annotations.readOnlyHint) annotations.destructiveHint = false;

  return { name, description: spec.description, shape, annotations, handler, group: spec.group, methods: spec.methods };
}

/**
 * Fold the captured tools into the exposed surface. Throws when the plan and the code disagree:
 * an original tool the plan does not place, one it places twice, or one it names that does not exist.
 */
export function buildExposedTools(captured: CapturedTool[], plan: Plan): ExposedTool[] {
  const originals = new Map(captured.map((t) => [t.name, t]));
  const placed = new Map<string, string>();
  for (const [name, spec] of Object.entries(plan.tools)) {
    if (!(spec.group in plan.groups)) throw new Error(`plan: ${name} is in unknown group ${spec.group}`);
    for (const original of Object.values(spec.methods)) {
      const earlier = placed.get(original);
      if (earlier) throw new Error(`plan: ${original} is placed in both ${earlier} and ${name}`);
      placed.set(original, name);
    }
  }
  const unplaced = captured.filter((t) => !placed.has(t.name)).map((t) => t.name);
  if (unplaced.length) throw new Error(`plan: tools not placed: ${unplaced.join(", ")}`);

  const exposed: ExposedTool[] = [];
  for (const [name, spec] of Object.entries(plan.tools)) {
    const methodNames = Object.keys(spec.methods);
    if (methodNames.length === 1) {
      const originalName = spec.methods[methodNames[0]];
      const original = originals.get(originalName);
      if (!original) throw new Error(`plan: ${name} names unknown tool ${originalName}`);
      if (originalName !== name) throw new Error(`plan: single-method tool ${name} must keep its original name`);
      exposed.push({ ...original, group: spec.group, methods: spec.methods });
    } else {
      exposed.push(buildMergedTool(name, spec, originals));
    }
  }
  return exposed;
}
