#!/usr/bin/env node
/* eslint-disable no-console */
/* global fetch */
/**
 * api-coverage.mjs — reconcile the platform's OpenAPI operations with the MCP tool surface.
 *
 *   node scripts/api-coverage.mjs [--spec <url-or-file>] [--write] [--check]
 *
 * Reads every operation from the spec (default http://localhost:8000/openapi.json), finds which
 * `src/tools/*.ts` tool calls each one, joins with the verdict map in docs/tool-scope.json and
 * regenerates the verdict table inside docs/tool-scope.md (between the AUTOGEN markers).
 *
 *   --write   rewrite docs/tool-scope.md and print a summary
 *   --check   exit 1 if the table on disk differs from the regenerated one (CI-friendly)
 *   (neither) print the regenerated table to stdout
 *
 * It exits non-zero when the map and the code disagree, so a platform release that adds an
 * endpoint, or a PR that adds a tool, forces a recorded decision:
 *   - an operation in the spec with no verdict
 *   - a verdict for an operation the spec no longer has
 *   - verdict `in` but no tool calls it, or verdict `out`/`deferred` but a tool does
 *   (a verdict may carry `tools: [...]` when the tool builds its path at runtime and the scanner cannot see it)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const METHODS = new Set(["get", "post", "put", "patch", "delete"]);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  const v = i >= 0 ? args[i + 1] : undefined;
  if (i >= 0 && (!v || v.startsWith("--"))) throw new Error(`${name} needs a value`);
  return v ?? dflt;
};

async function loadSpec(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`spec fetch failed: ${res.status} ${source}`);
    return res.json();
  }
  return JSON.parse(readFileSync(source, "utf8"));
}

/** `/api/organizations/{org_id}/teams/{team_id}` → `/organizations/{}/teams/{}` */
const normSpecPath = (p) =>
  p
    .replace(/^\/api/, "")
    .replace(/\{[^}]+\}/g, "{}")
    .replace(/\/$/, "");
/** `/organizations/${org_id}/teams/${team_id}?x=1` → `/organizations/{}/teams/{}` */
const normCodePath = (p) =>
  p
    .replace(/\$\{[^}]+\}/g, "{}")
    .split("?")[0]
    .replace(/\/$/, "");

/** Scan each server.tool( block: map "METHOD /norm/path" → [tool names], plus the set of registered names. */
function scanTools() {
  const dir = join(ROOT, "src", "tools");
  const calls = new Map();
  const registered = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(dir, file), "utf8");
    // Split on tool registrations; each chunk starts with the tool name.
    const chunks = src.split(/server\.tool\(\s*\n?\s*"/).slice(1);
    for (const chunk of chunks) {
      const name = chunk.slice(0, chunk.indexOf('"'));
      registered.add(name);
      const re = /client\.(get|post|put|patch|delete|getText)\s*(?:<[^>]*>)?\(\s*([`"'])([^`"']+)\2/g;
      let m;
      while ((m = re.exec(chunk))) {
        const method = m[1].replace("Text", "").toUpperCase();
        const key = `${method} ${normCodePath(m[3])}`;
        if (!calls.has(key)) calls.set(key, []);
        if (!calls.get(key).includes(name)) calls.get(key).push(name);
      }
    }
  }
  return { calls, registered };
}

/** Escape a value for a markdown table cell: backslashes first, then pipes. */
const cell = (v) =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|");

function renderTable(rows) {
  const lines = ["| Verdict | Tag | Operation | Tool(s) | Reason | Note |", "| --- | --- | --- | --- | --- | --- |"];
  for (const r of rows) {
    lines.push(
      `| ${r.verdict} | ${r.tag} | \`${r.key}\` | ${r.tools.map((t) => `\`${t}\``).join(", ") || "—"} | ${r.reason ?? ""} | ${cell(r.note)} |`,
    );
  }
  return lines.join("\n");
}

const spec = await loadSpec(opt("--spec", "http://localhost:8000/openapi.json"));
const map = JSON.parse(readFileSync(join(ROOT, "docs", "tool-scope.json"), "utf8"));
const { calls, registered } = scanTools();

const rows = [];
const problems = [];
const seen = new Set();
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (!METHODS.has(method)) continue;
    const key = `${method.toUpperCase()} ${path}`;
    const tag = (op.tags ?? ["-"])[0];
    const v = map.operations[key];
    // `tools` in the map declares coverage the scanner cannot see (paths built at runtime).
    const tools = v?.tools ?? calls.get(`${method.toUpperCase()} ${normSpecPath(path)}`) ?? [];
    seen.add(key);
    if (!v) {
      problems.push(`no verdict for ${key} (tag ${tag}) — add it to docs/tool-scope.json`);
      continue;
    }
    if (v.verdict === "in" && tools.length === 0) problems.push(`verdict in but no tool calls ${key}`);
    if (v.verdict !== "in" && tools.length > 0)
      problems.push(`verdict ${v.verdict} but ${tools.join(", ")} calls ${key}`);
    if (v.verdict === "out" && !v.reason) problems.push(`out without reason: ${key}`);
    for (const t of v.tools ?? []) {
      if (!registered.has(t)) problems.push(`tools override names ${t} on ${key} but no such tool is registered`);
    }
    if (v.verdict === "deferred" && !v.note) problems.push(`deferred without promotion trigger: ${key}`);
    if (v.reason && !map.reasons[v.reason]) problems.push(`unknown reason '${v.reason}' on ${key}`);
    rows.push({ key, tag, tools, ...v });
  }
}
for (const key of Object.keys(map.operations)) {
  if (!seen.has(key)) problems.push(`verdict for ${key} but the spec no longer has it`);
}

// Vocabulary drift: the platform's system_type pattern must equal src/lib/system-types.ts.
// The same pattern is kept in tests/fixtures/platform-system-type-pattern.json for the unit test;
// --write refreshes the fixture from the spec so the two can never disagree for long.
{
  const pattern = spec.components?.schemas?.SystemCreate?.properties?.system_type?.pattern;
  if (!pattern) {
    problems.push("spec has no SystemCreate.system_type pattern — cannot check the system-type vocabulary");
  } else {
    const fromSpec = pattern.replace(/^\^\(/, "").replace(/\)\$$/, "").split("|");
    const tsSrc = readFileSync(join(ROOT, "src", "lib", "system-types.ts"), "utf8");
    const fromCode = [...tsSrc.match(/SYSTEM_TYPES = \[([\s\S]*?)\] as const/)[1].matchAll(/"([a-z_]+)"/g)].map(
      (m) => m[1],
    );
    const missing = fromSpec.filter((t) => !fromCode.includes(t));
    const extra = fromCode.filter((t) => !fromSpec.includes(t));
    if (missing.length || extra.length)
      problems.push(
        `system_type vocabulary drift — platform has [${missing.join(", ")}] the enum lacks; enum has [${extra.join(", ")}] the platform lacks. Update src/lib/system-types.ts`,
      );
    const fixturePath = join(ROOT, "tests", "fixtures", "platform-system-type-pattern.json");
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
    if (fixture.pattern !== pattern) {
      if (flag("--write")) {
        writeFileSync(fixturePath, JSON.stringify({ ...fixture, pattern }, null, 2) + "\n");
        console.log("refreshed tests/fixtures/platform-system-type-pattern.json from the spec");
      } else {
        problems.push(
          "tests/fixtures/platform-system-type-pattern.json is stale — run with --write to refresh it from the spec",
        );
      }
    }
  }
}

const order = { in: 0, deferred: 1, out: 2 };
rows.sort((a, b) => order[a.verdict] - order[b.verdict] || a.tag.localeCompare(b.tag) || a.key.localeCompare(b.key));

const counts = rows.reduce((acc, r) => ((acc[r.verdict] = (acc[r.verdict] ?? 0) + 1), acc), {});
const toolCount = new Set([...calls.values(), ...Object.values(map.operations).map((v) => v.tools ?? [])].flat()).size;
const summary = `${rows.length} operations: ${counts.in ?? 0} in · ${counts.deferred ?? 0} deferred · ${counts.out ?? 0} out · ${toolCount} tools`;

const table = `<!-- AUTOGEN:START — generated by scripts/api-coverage.mjs; do not edit by hand -->\n_${summary}._\n\n${renderTable(rows)}\n<!-- AUTOGEN:END -->`;

const docPath = join(ROOT, "docs", "tool-scope.md");
const marker = /<!-- AUTOGEN:START[\s\S]*?<!-- AUTOGEN:END -->/;

if (flag("--write")) {
  const doc = readFileSync(docPath, "utf8");
  if (!marker.test(doc)) throw new Error("docs/tool-scope.md has no AUTOGEN markers");
  writeFileSync(docPath, doc.replace(marker, table));
  console.log(summary);
} else if (flag("--check")) {
  const doc = readFileSync(docPath, "utf8");
  // Prettier re-pads table columns and adds blank lines around the markers, so compare with whitespace collapsed.
  const squash = (t) =>
    t
      .split("\n")
      .map((l) =>
        l
          .replace(/[ \t]+/g, " ")
          .replace(/ ?\| ?/g, "|")
          .replace(/-{3,}/g, "---")
          .trim(),
      )
      .filter(Boolean)
      .join("\n");
  const current = doc.match(marker)?.[0];
  if (current === undefined || squash(current) !== squash(table)) {
    console.error("docs/tool-scope.md is stale — run: node scripts/api-coverage.mjs --write");
    process.exitCode = 1;
  } else {
    console.log(`table up to date — ${summary}`);
  }
} else {
  console.log(table);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exitCode = 1;
}
