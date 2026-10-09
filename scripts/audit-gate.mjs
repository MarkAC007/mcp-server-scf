#!/usr/bin/env node
/* eslint-disable no-console */
// CI dependency audit gate.
//
// Runs `npm audit --json` and fails when any advisory at or above AUDIT_LEVEL
// (default: high) is present, unless that advisory is listed in
// .github/audit-exceptions.json with a reason and an expiry date that has not
// passed. A reported advisory whose exception has expired fails the gate, so
// every accepted finding is re-decided on a date somebody chose in advance.
// An exception for an advisory npm no longer reports is printed as UNUSED so
// it gets removed, but does not fail the build that fixed it.
//
// This exists because `npm audit` has no per-advisory allow-list, and the
// repository's 14-day release-age cooldown (~/.npmrc min-release-age) can leave
// a known, already-patched advisory uninstallable for up to two weeks. The gate
// keeps CI honest about that gap instead of hiding it behind a lower audit
// level or `--omit=dev`.
//
// The gate fails closed: anything it cannot read or parse exits 2, never 0.
//
// Usage: node scripts/audit-gate.mjs            (from the repo root)
// Env:   AUDIT_LEVEL=high|critical|moderate|low (default high)
//        AUDIT_EXCEPTIONS=<path>                (default .github/audit-exceptions.json)
//        AUDIT_REPORT=<path>                    read a saved `npm audit --json` report instead of running npm (tests)
//        AUDIT_TODAY=YYYY-MM-DD                 override today's date (tests)

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const LEVELS = ["info", "low", "moderate", "high", "critical"];
const MAX_EXCEPTION_DAYS = 365;

const level = process.env.AUDIT_LEVEL ?? "high";
if (!LEVELS.includes(level)) {
  console.error(`audit-gate: unknown AUDIT_LEVEL "${level}" (expected one of ${LEVELS.join(", ")})`);
  process.exit(2);
}
const threshold = LEVELS.indexOf(level);
const exceptionsPath = process.env.AUDIT_EXCEPTIONS ?? ".github/audit-exceptions.json";

// --- dates -----------------------------------------------------------------
// Dates are compared as UTC calendar days. A string that matches YYYY-MM-DD but
// is not a real date (2099-99-99) is rejected rather than compared lexically.
function parseDay(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return null;
  return t;
}
const todayStr = process.env.AUDIT_TODAY ?? new Date().toISOString().slice(0, 10);
const today = parseDay(todayStr);
if (today === null) {
  console.error(`audit-gate: AUDIT_TODAY "${todayStr}" is not a valid YYYY-MM-DD date`);
  process.exit(2);
}
const DAY_MS = 24 * 60 * 60 * 1000;

// --- load exceptions -------------------------------------------------------
let exceptions = [];
if (existsSync(exceptionsPath)) {
  try {
    exceptions = JSON.parse(readFileSync(exceptionsPath, "utf8"));
  } catch (err) {
    console.error(`audit-gate: ${exceptionsPath} is not valid JSON: ${err.message}`);
    process.exit(2);
  }
}
if (!Array.isArray(exceptions)) {
  console.error(`audit-gate: ${exceptionsPath} must be a JSON array`);
  process.exit(2);
}
const ADVISORY_RE = /^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/;
let invalid = false;
for (const e of exceptions) {
  const problems = [];
  if (!ADVISORY_RE.test(e.advisory ?? "")) problems.push("advisory must be a GHSA id");
  if (typeof e.package !== "string" || !e.package) problems.push("package is required");
  if (typeof e.reason !== "string" || e.reason.trim().length < 20) problems.push("reason must explain the decision");
  const expires = parseDay(e.expires);
  if (expires === null) {
    problems.push("expires must be a real YYYY-MM-DD calendar date");
  } else if (expires - today > MAX_EXCEPTION_DAYS * DAY_MS) {
    problems.push(`expires must be within ${MAX_EXCEPTION_DAYS} days of today (${todayStr})`);
  }
  if (problems.length) {
    invalid = true;
    console.error(`audit-gate: invalid exception ${JSON.stringify(e)}: ${problems.join("; ")}`);
  }
}
if (invalid) process.exit(2);

// --- obtain the audit report -----------------------------------------------
// `npm audit` exits non-zero whenever it finds anything; the JSON on stdout is
// still complete, so the exit code is ignored and the report is parsed instead.
let raw;
if (process.env.AUDIT_REPORT) {
  try {
    raw = readFileSync(process.env.AUDIT_REPORT, "utf8");
  } catch (err) {
    console.error(`audit-gate: cannot read AUDIT_REPORT ${process.env.AUDIT_REPORT}: ${err.message}`);
    process.exit(2);
  }
} else {
  const audit = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (audit.error) {
    console.error(`audit-gate: could not run npm audit: ${audit.error.message}`);
    process.exit(2);
  }
  raw = audit.stdout;
  if (!raw?.trim()) {
    console.error("audit-gate: npm audit produced no output");
    console.error(audit.stderr?.slice(0, 2000));
    process.exit(2);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("audit-gate: could not parse `npm audit --json` output (malformed report)");
  console.error(raw?.slice(0, 2000));
  process.exit(2);
}
if (report && typeof report === "object" && report.error) {
  console.error(`audit-gate: npm audit failed: ${report.error.code ?? ""} ${report.error.summary ?? ""}`.trim());
  process.exit(2);
}
if (
  !report ||
  typeof report !== "object" ||
  typeof report.vulnerabilities !== "object" ||
  report.vulnerabilities === null ||
  typeof report.metadata?.vulnerabilities !== "object"
) {
  console.error(
    "audit-gate: malformed audit report: expected `vulnerabilities` and `metadata.vulnerabilities` objects",
  );
  process.exit(2);
}

// --- collect advisories ----------------------------------------------------
// vulnerabilities[name].via is a mix of advisory objects (the root cause) and
// package-name strings (a package that is only flagged because it depends on
// a vulnerable one). Only the advisory objects carry a GHSA id and severity;
// the dependents clear automatically once every root advisory is handled.
const advisories = new Map(); // ghsa -> { package, severity, title, url }
for (const vuln of Object.values(report.vulnerabilities)) {
  for (const via of vuln?.via ?? []) {
    if (typeof via !== "object" || via === null || typeof via.url !== "string") continue;
    const ghsa = via.url.split("/").pop();
    if (!ADVISORY_RE.test(ghsa)) continue;
    if (!advisories.has(ghsa)) {
      advisories.set(ghsa, { package: via.name, severity: via.severity, title: via.title, url: via.url });
    }
  }
}

// --- decide ----------------------------------------------------------------
const blocking = [];
const excepted = [];
const expired = [];
const unused = [];
const byAdvisory = new Map(exceptions.map((e) => [e.advisory, e]));

for (const [ghsa, adv] of advisories) {
  if (LEVELS.indexOf(adv.severity) < threshold) continue;
  const exc = byAdvisory.get(ghsa);
  if (!exc || exc.package !== adv.package) {
    blocking.push({ ghsa, ...adv });
  } else if (parseDay(exc.expires) < today) {
    expired.push({ ghsa, ...adv, expires: exc.expires, reason: exc.reason });
  } else {
    excepted.push({ ghsa, ...adv, expires: exc.expires, reason: exc.reason });
  }
}
for (const exc of exceptions) {
  if (!advisories.has(exc.advisory)) unused.push(exc);
}

// --- report ----------------------------------------------------------------
const counts = report.metadata.vulnerabilities;
console.log(
  `audit-gate: npm audit found ${counts.total ?? 0} vulnerable package(s) ` +
    `(critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, moderate ${counts.moderate ?? 0}, low ${counts.low ?? 0}); ` +
    `gate level: ${level}; today: ${todayStr}; exceptions file: ${exceptionsPath}`,
);

for (const a of excepted) {
  console.log(`  ACCEPTED  ${a.ghsa}  ${a.package}  [${a.severity}]  until ${a.expires} — ${a.reason}`);
}
for (const e of unused) {
  console.log(
    `  UNUSED    ${e.advisory}  ${e.package}  no longer reported by npm audit; remove it from ${exceptionsPath}`,
  );
}
for (const a of expired) {
  console.log(`  EXPIRED   ${a.ghsa}  ${a.package}  [${a.severity}]  exception expired ${a.expires} — ${a.title}`);
}
for (const a of blocking) {
  console.log(`  BLOCKING  ${a.ghsa}  ${a.package}  [${a.severity}]  ${a.title}  ${a.url}`);
}

if (blocking.length || expired.length) {
  console.error(
    `audit-gate: FAIL — ${blocking.length} unhandled and ${expired.length} expired advisory(ies) at level ${level} or above. ` +
      "Fix by upgrading the dependency, or record a reasoned, dated exception in " +
      `${exceptionsPath} if the fix is not yet installable.`,
  );
  process.exit(1);
}
console.log(`audit-gate: PASS — no unhandled advisories at level ${level} or above.`);
