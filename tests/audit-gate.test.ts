import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// scripts/audit-gate.mjs is the CI "Audit dependencies" step. These tests feed
// it saved `npm audit --json` reports and exception files through env vars so
// they never touch the registry.

const GATE = resolve(__dirname, "../scripts/audit-gate.mjs");
const GHSA = "GHSA-aaaa-bbbb-cccc";
const TODAY = "2026-10-08";

interface Advisory {
  name: string;
  severity: string;
  ghsa?: string;
}

function report(advisories: Advisory[]): unknown {
  const vulnerabilities: Record<string, unknown> = {};
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const a of advisories) {
    vulnerabilities[a.name] = {
      name: a.name,
      severity: a.severity,
      via: [
        {
          source: 1,
          name: a.name,
          title: `${a.name} does something bad`,
          url: `https://github.com/advisories/${a.ghsa ?? GHSA}`,
          severity: a.severity,
          range: "<999",
        },
      ],
      range: "<999",
      nodes: [`node_modules/${a.name}`],
      fixAvailable: false,
    };
    counts[a.severity as keyof typeof counts]++;
    counts.total++;
  }
  return { auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: counts } };
}

function runGate(opts: { report: unknown; exceptions?: unknown; today?: string }) {
  const dir = mkdtempSync(join(tmpdir(), "audit-gate-"));
  const reportPath = join(dir, "audit.json");
  writeFileSync(reportPath, typeof opts.report === "string" ? opts.report : JSON.stringify(opts.report));
  const exceptionsPath = join(dir, "exceptions.json");
  writeFileSync(exceptionsPath, JSON.stringify(opts.exceptions ?? []));
  const result = spawnSync(process.execPath, [GATE], {
    encoding: "utf8",
    cwd: resolve(__dirname, ".."),
    env: {
      ...process.env,
      AUDIT_REPORT: reportPath,
      AUDIT_EXCEPTIONS: exceptionsPath,
      AUDIT_TODAY: opts.today ?? TODAY,
    },
  });
  return { status: result.status, out: `${result.stdout}\n${result.stderr}` };
}

const validException = {
  advisory: GHSA,
  package: "left-pad",
  reason: "Fixed upstream but the patched release is still inside the release-age cooldown.",
  expires: "2026-10-20",
};

describe("audit-gate", () => {
  it("passes when nothing at or above the gate level is reported", () => {
    const r = runGate({ report: report([{ name: "left-pad", severity: "moderate" }]) });
    expect(r.status).toBe(0);
    expect(r.out).toContain("PASS");
  });

  it("fails on an unhandled high advisory", () => {
    const r = runGate({ report: report([{ name: "left-pad", severity: "high" }]) });
    expect(r.status).toBe(1);
    expect(r.out).toContain(`BLOCKING  ${GHSA}`);
  });

  it("accepts a high advisory with a reasoned, unexpired exception", () => {
    const r = runGate({ report: report([{ name: "left-pad", severity: "high" }]), exceptions: [validException] });
    expect(r.status).toBe(0);
    expect(r.out).toContain(`ACCEPTED  ${GHSA}`);
  });

  it("fails when the exception has expired", () => {
    const r = runGate({
      report: report([{ name: "left-pad", severity: "high" }]),
      exceptions: [{ ...validException, expires: "2026-10-07" }],
    });
    expect(r.status).toBe(1);
    expect(r.out).toContain(`EXPIRED   ${GHSA}`);
  });

  it("treats the expiry date as inclusive", () => {
    const r = runGate({
      report: report([{ name: "left-pad", severity: "high" }]),
      exceptions: [{ ...validException, expires: TODAY }],
    });
    expect(r.status).toBe(0);
  });

  it("rejects an exception whose package does not match the advisory", () => {
    const r = runGate({
      report: report([{ name: "left-pad", severity: "high" }]),
      exceptions: [{ ...validException, package: "right-pad" }],
    });
    expect(r.status).toBe(1);
    expect(r.out).toContain("BLOCKING");
  });

  it("rejects an impossible calendar date instead of accepting it", () => {
    const r = runGate({
      report: report([{ name: "left-pad", severity: "high" }]),
      exceptions: [{ ...validException, expires: "2099-99-99" }],
    });
    expect(r.status).toBe(2);
    expect(r.out).toContain("expires");
  });

  it("rejects an expiry more than a year away", () => {
    const r = runGate({
      report: report([{ name: "left-pad", severity: "high" }]),
      exceptions: [{ ...validException, expires: "2028-01-01" }],
    });
    expect(r.status).toBe(2);
    expect(r.out).toContain("expires");
  });

  it("rejects an exception without a real reason", () => {
    const r = runGate({
      report: report([{ name: "left-pad", severity: "high" }]),
      exceptions: [{ ...validException, reason: "because" }],
    });
    expect(r.status).toBe(2);
  });

  it("fails closed when the audit report is malformed", () => {
    const r = runGate({ report: { auditReportVersion: 2 } });
    expect(r.status).toBe(2);
    expect(r.out).toContain("malformed");
  });

  it("fails closed when the audit report is not JSON", () => {
    const r = runGate({ report: "npm ERR! something" });
    expect(r.status).toBe(2);
  });

  it("fails closed when npm audit itself reported an error", () => {
    const r = runGate({ report: { error: { code: "ENOAUDIT", summary: "registry unavailable" } } });
    expect(r.status).toBe(2);
    expect(r.out).toContain("ENOAUDIT");
  });

  it("warns about an exception that is no longer reported without failing", () => {
    const r = runGate({ report: report([]), exceptions: [validException] });
    expect(r.status).toBe(0);
    expect(r.out).toContain(`UNUSED    ${GHSA}`);
  });

  it("ignores advisories below the gate level even without exceptions", () => {
    const r = runGate({
      report: report([
        { name: "left-pad", severity: "low", ghsa: "GHSA-1111-2222-3333" },
        { name: "right-pad", severity: "moderate", ghsa: "GHSA-4444-5555-6666" },
      ]),
    });
    expect(r.status).toBe(0);
  });
});
