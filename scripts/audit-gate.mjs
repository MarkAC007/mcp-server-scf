#!/usr/bin/env node
/* eslint-disable no-console */
// CI dependency audit gate.
//
// Runs `npm audit --json` and fails when any advisory at or above AUDIT_LEVEL
// (default: high) is present, unless that advisory is listed in
// .github/audit-exceptions.json with a reason and an expiry date that has not
// passed. An expired exception fails the gate on its own, so every accepted
// finding is re-decided on a date somebody chose in advance.
//
// This exists because `npm audit` has no per-advisory allow-list, and the
// repository's 14-day release-age cooldown (~/.npmrc min-release-age) can leave
// a known, already-patched advisory uninstallable for up to two weeks. The gate
// keeps CI honest about that gap instead of hiding it behind a lower audit
// level or `--omit=dev`.
//
// Usage: node scripts/audit-gate.mjs            (from the repo root)
// Env:   AUDIT_LEVEL=high|critical|moderate|low (default high)
//        AUDIT_EXCEPTIONS=<path>                (default .github/audit-exceptions.json)

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const LEVELS = ["info", "low", "moderate", "high", "critical"];
const level = process.env.AUDIT_LEVEL ?? "high";
if (!LEVELS.includes(level)) {
  console.error(`audit-gate: unknown AUDIT_LEVEL "${level}" (expected one of ${LEVELS.join(", ")})`);
  process.exit(2);
}
const threshold = LEVELS.indexOf(level);
const exceptionsPath = process.env.AUDIT_EXCEPTIONS ?? ".github/audit-exceptions.json";
const today = new Date().toISOString().slice(0, 10);

// --- load exceptions -------------------------------------------------------
const exceptions = existsSync(exceptionsPath) ? JSON.parse(readFileSync(exceptionsPath, "utf8")) : [];
if (!Array.isArray(exceptions)) {
  console.error(`audit-gate: ${exceptionsPath} must be a JSON array`);
  process.exit(2);
}
const ADVISORY_RE = /^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let invalid = false;
for (const e of exceptions) {
  const problems = [];
  if (!ADVISORY_RE.test(e.advisory ?? "")) problems.push("advisory must be a GHSA id");
  if (typeof e.package !== "string" || !e.package) problems.push("package is required");
  if (typeof e.reason !== "string" || e.reason.length < 20) problems.push("reason must explain the decision");
  if (!DATE_RE.test(e.expires ?? "")) problems.push("expires must be YYYY-MM-DD");
  if (problems.length) {
    invalid = true;
    console.error(`audit-gate: invalid exception ${JSON.stringify(e)}: ${problems.join("; ")}`);
  }
}
if (invalid) process.exit(2);

// --- run npm audit ---------------------------------------------------------
// `npm audit` exits non-zero whenever it finds anything; the JSON on stdout is
// still complete, so the exit code is ignored and the report is parsed instead.
const audit = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error("audit-gate: could not parse `npm audit --json` output");
  console.error(audit.stdout?.slice(0, 2000));
  console.error(audit.stderr?.slice(0, 2000));
  process.exit(2);
}
if (report.error) {
  console.error(`audit-gate: npm audit failed: ${report.error.code ?? ""} ${report.error.summary ?? ""}`);
  process.exit(2);
}

// --- collect advisories ----------------------------------------------------
// vulnerabilities[name].via is a mix of advisory objects (the root cause) and
// package-name strings (a package that is only flagged because it depends on
// a vulnerable one). Only the advisory objects carry a GHSA id and severity;
// the dependents clear automatically once every root advisory is handled.
const advisories = new Map(); // ghsa -> { package, severity, title, url }
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== "object" || !via.url) continue;
    const ghsa = via.url.split("/").pop();
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
  } else if (exc.expires < today) {
    expired.push({ ghsa, ...adv, expires: exc.expires, reason: exc.reason });
  } else {
    excepted.push({ ghsa, ...adv, expires: exc.expires, reason: exc.reason });
  }
}
for (const exc of exceptions) {
  if (!advisories.has(exc.advisory)) unused.push(exc);
}

// --- report ----------------------------------------------------------------
const counts = report.metadata?.vulnerabilities ?? {};
console.log(
  `audit-gate: npm audit found ${counts.total ?? 0} vulnerable package(s) ` +
    `(critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, moderate ${counts.moderate ?? 0}, low ${counts.low ?? 0}); ` +
    `gate level: ${level}; exceptions file: ${exceptionsPath}`,
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
