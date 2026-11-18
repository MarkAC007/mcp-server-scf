import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The two gates auto-release.yml runs before it tags or publishes anything:
//   1. scripts/release-checks-gate.mjs: every required check is `success` on the commit being released;
//   2. scripts/audit-gate.mjs: no unhandled high or critical advisory (tests/audit-gate.test.ts covers it).
//
// The first block feeds the checks gate saved check-run lists through CHECK_RUNS_FILE, so it never
// calls GitHub. The second block reads the workflow files as text and holds the release job to the
// order the gates depend on: both gates first, anything public after.

const ROOT = resolve(__dirname, "..");
const GATE = resolve(ROOT, "scripts/release-checks-gate.mjs");
const SHA = "a".repeat(40);
const REQUIRED = ["build (20)", "build (22)", "Secret Detection"];

interface Run {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url?: string;
  app?: string;
}

let nextId = 1000;
function run(name: string, conclusion: string | null, over: Partial<Run> = {}): Run {
  return {
    id: nextId++,
    name,
    status: conclusion === null ? "in_progress" : "completed",
    conclusion,
    html_url: `https://example.test/${encodeURIComponent(name)}`,
    app: "github-actions",
    ...over,
  };
}
const allGreen = () => REQUIRED.map((name) => run(name, "success"));

function runGate(runs: unknown, env: Record<string, string | undefined> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "release-checks-gate-"));
  const file = join(dir, "check-runs.json");
  writeFileSync(file, typeof runs === "string" ? runs : JSON.stringify(runs));
  const merged: Record<string, string | undefined> = {
    ...process.env,
    GITHUB_ACTIONS: "false",
    CHECK_RUNS_FILE: file,
    REQUIRED_CHECKS: REQUIRED.join("|"),
    GATE_REPO: "owner/repo",
    GATE_SHA: SHA,
    GATE_WAIT_SECONDS: "0",
    ...env,
  };
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
  const result = spawnSync(process.execPath, [GATE], { encoding: "utf8", cwd: ROOT, env: merged });
  return { status: result.status, out: `${result.stdout}\n${result.stderr}` };
}

describe("release-checks-gate", () => {
  it("passes when every required check concluded success", () => {
    const r = runGate(allGreen());
    expect(r.status).toBe(0);
    expect(r.out).toContain("PASS");
  });

  it("ignores checks that are not required, whatever they concluded", () => {
    const r = runGate([...allGreen(), run("Verify release surfaces are in sync", "failure")]);
    expect(r.status).toBe(0);
  });

  it.each(["failure", "cancelled", "timed_out", "skipped", "neutral", "action_required", "stale"])(
    "refuses a required check that concluded %s",
    (conclusion) => {
      const runs = allGreen();
      runs[1] = run("build (22)", conclusion);
      const r = runGate(runs);
      expect(r.status).toBe(1);
      expect(r.out).toContain(`build (22)=${conclusion}`);
      expect(r.out).not.toContain("PASS");
    },
  );

  it("refuses a completed check that carries no conclusion", () => {
    const runs = allGreen();
    runs[0] = run("build (20)", "success", { conclusion: null, status: "completed" });
    const r = runGate(runs);
    expect(r.status).toBe(1);
    expect(r.out).toContain("build (20)=unknown");
  });

  it("refuses when a required check is still running at the deadline", () => {
    const runs = allGreen();
    runs[2] = run("Secret Detection", null);
    const r = runGate(runs);
    expect(r.status).toBe(1);
    expect(r.out).toContain("Secret Detection (pending)");
  });

  it("refuses when a required check never appeared", () => {
    const r = runGate(allGreen().slice(0, 2));
    expect(r.status).toBe(1);
    expect(r.out).toContain("Secret Detection (missing)");
  });

  it("refuses an empty list of check runs", () => {
    const r = runGate([]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("(missing)");
  });

  it("lets a newer passing re-run replace an older failure", () => {
    const failed = run("build (20)", "failure");
    const runs = [failed, ...allGreen()];
    const r = runGate(runs);
    expect(r.status).toBe(0);
  });

  it("lets a newer failure replace an older pass, whatever order the list is in", () => {
    const green = allGreen();
    const later = run("build (20)", "failure");
    const r = runGate([later, ...green]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("build (20)=failure");
  });

  it("treats a queued re-run as pending even though an older run passed", () => {
    const green = allGreen();
    const rerun = run("build (20)", null, { status: "queued" });
    const r = runGate([...green, rerun]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("build (20) (pending)");
  });

  it("does not let another app's check of the same name satisfy the gate", () => {
    const runs = allGreen();
    runs[0] = run("build (20)", "success", { app: "some-other-app" });
    const r = runGate(runs);
    expect(r.status).toBe(1);
    expect(r.out).toContain("build (20) (missing)");
  });

  it("does not let another app's newer pass hide a GitHub Actions failure", () => {
    const runs = allGreen();
    runs[0] = run("build (20)", "failure");
    runs.push(run("build (20)", "success", { app: "some-other-app" }));
    const r = runGate(runs);
    expect(r.status).toBe(1);
    expect(r.out).toContain("build (20)=failure");
  });

  it("fails closed when the check runs are not valid JSON", () => {
    const r = runGate("{not json");
    expect(r.status).toBe(2);
    expect(r.out).toContain("could not read the check runs");
  });

  it("fails closed when the check runs are not a list", () => {
    const r = runGate({ check_runs: allGreen() });
    expect(r.status).toBe(2);
  });

  it("fails closed on a record without an id", () => {
    const r = runGate([{ name: "build (20)", status: "completed", conclusion: "success", app: "github-actions" }]);
    expect(r.status).toBe(2);
  });

  it("fails closed when the saved file does not exist", () => {
    const r = runGate(allGreen(), { CHECK_RUNS_FILE: join(tmpdir(), "no-such-dir", "nothing.json") });
    expect(r.status).toBe(2);
  });

  it("refuses to run without a list of required checks", () => {
    expect(runGate(allGreen(), { REQUIRED_CHECKS: "" }).status).toBe(2);
    expect(runGate(allGreen(), { REQUIRED_CHECKS: " | | " }).status).toBe(2);
  });

  it("refuses a commit that is not a full sha", () => {
    const r = runGate(allGreen(), { GATE_SHA: "main" });
    expect(r.status).toBe(2);
    expect(r.out).toContain("GATE_SHA");
  });

  it("refuses a repository that is not owner/name", () => {
    const r = runGate(allGreen(), { GATE_REPO: "just-a-name", GITHUB_REPOSITORY: undefined });
    expect(r.status).toBe(2);
  });

  it("refuses a wait that is not a whole number of seconds", () => {
    const r = runGate(allGreen(), { GATE_WAIT_SECONDS: "soon" });
    expect(r.status).toBe(2);
  });

  it("emits a run annotation when it refuses inside GitHub Actions", () => {
    const runs = allGreen();
    runs[1] = run("build (22)", "failure");
    const r = runGate(runs, { GITHUB_ACTIONS: "true" });
    expect(r.status).toBe(1);
    expect(r.out).toContain("::error::release gate:");
  });
});

describe("auto-release.yml release gates", () => {
  const workflows = resolve(ROOT, ".github/workflows");
  const release = readFileSync(join(workflows, "auto-release.yml"), "utf8");
  const ci = readFileSync(join(workflows, "ci.yml"), "utf8");
  const security = readFileSync(join(workflows, "security.yml"), "utf8");

  // Position of the one line that carries `needle`; fails when it is absent or repeated, so a
  // step that is removed, renamed or duplicated cannot pass an ordering check by accident.
  function lineOf(needle: string): number {
    const hits = release
      .split("\n")
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => !line.trimStart().startsWith("#") && line.includes(needle));
    expect(hits, `expected exactly one non-comment line containing ${JSON.stringify(needle)}`).toHaveLength(1);
    return hits[0].i;
  }

  const checksGate = () => lineOf("run: node scripts/release-checks-gate.mjs");
  const auditGate = () => lineOf("run: node scripts/audit-gate.mjs");

  // Everything the job does that someone outside the runner can see.
  const publicEffects: Array<[string, string]> = [
    ["the tag push", 'git push origin "v${NEW_VERSION}"'],
    ["the npm publish", "run: npm publish"],
    ["the MCP Registry publish", "./mcp-publisher publish"],
    ["the provenance attestation", "uses: actions/attest-build-provenance@"],
    ["the GitHub Release", "uses: softprops/action-gh-release@"],
    ["the version-bump branch push", '"HEAD:refs/heads/${BUMP_BRANCH}"'],
  ];

  it.each(publicEffects)("runs both gates before %s", (_what, needle) => {
    const effect = lineOf(needle);
    expect(checksGate()).toBeLessThan(effect);
    expect(auditGate()).toBeLessThan(effect);
  });

  // The checks gate reads HEAD. The version-bump step commits locally, and that commit has no
  // check runs, so the gate has to look while HEAD is still the merge commit.
  it("runs the checks gate before the local version-bump commit moves HEAD", () => {
    expect(checksGate()).toBeLessThan(lineOf('git commit -m "chore(release): bump'));
  });

  it("installs from the lockfile before the audit gate reads it", () => {
    expect(lineOf("run: npm ci")).toBeLessThan(auditGate());
  });

  it("does not let either gate step continue on error", () => {
    expect(release).not.toMatch(/continue-on-error/);
    for (const gate of [checksGate(), auditGate()]) {
      expect(release.split("\n")[gate]).not.toMatch(/\|\||;\s*true|exit 0/);
    }
  });

  it("runs both gate steps unconditionally", () => {
    const lines = release.split("\n");
    for (const gate of [checksGate(), auditGate()]) {
      let start = gate;
      while (!lines[start].startsWith("      - ")) start--;
      const step = lines.slice(start, gate + 1).filter((line) => !line.trimStart().startsWith("#"));
      expect(step[0]).toMatch(/^ {6}- name: /);
      expect(step.join("\n")).not.toMatch(/^\s+(if|continue-on-error):/m);
    }
  });

  // Each job works out its version from the tags it sees at checkout, and the tag is pushed only
  // after the gates have waited. Without this, two releases started close together pick the same version.
  it("runs one release at a time and never cancels one that has started", () => {
    expect(release).toMatch(/^ {4}concurrency:\n {6}group: auto-release\n {6}cancel-in-progress: false$/m);
  });

  it("grants the job read access to check runs", () => {
    expect(release).toMatch(/^ {6}checks: read\b/m);
  });

  it("requires only check names that ci.yml and security.yml produce", () => {
    const required = /REQUIRED_CHECKS: "([^"]+)"/.exec(release)?.[1].split("|") ?? [];
    expect(required.length).toBeGreaterThan(0);

    // ci.yml: one job, run once per node version. GitHub shows it as "<job name> (<version>)", where
    // the job name is the job's `name:` if it has one and its id if not.
    const jobs = [...ci.slice(ci.indexOf("\njobs:\n")).matchAll(/^ {2}([A-Za-z0-9_-]+):$/gm)].map((m) => m[1]);
    expect(jobs, "ci.yml is expected to hold exactly one job").toHaveLength(1);
    const ciJob = /^ {4}name: (.+)$/m.exec(ci)?.[1].trim() ?? jobs[0];
    const versions =
      /node-version: \[([^\]]+)\]/
        .exec(ci)?.[1]
        .split(",")
        .map((v) => v.trim()) ?? [];
    expect(versions.length).toBeGreaterThan(0);
    // security.yml: every job is named.
    const named = [...security.matchAll(/^ {4}name: (.+)$/gm)].map((m) => m[1].trim());
    const produced = new Set([...versions.map((v) => `${ciJob} (${v})`), ...named]);

    for (const name of required) {
      expect([...produced], `REQUIRED_CHECKS names "${name}", which no job produces`).toContain(name);
    }
    // Every CI build must be required: a node version added to the matrix is gated from day one.
    for (const v of versions) expect(required).toContain(`${ciJob} (${v})`);
  });

  it("runs both workflows the required checks come from on a push to main", () => {
    for (const workflow of [ci, security]) {
      expect(workflow).toMatch(/^on:\n {2}push:\n {4}branches: \[main\]/m);
    }
  });
});
