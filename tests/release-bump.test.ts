import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The "Determine version bump" step of auto-release.yml decides whether a merged pull request
// releases as a patch, minor or major version. These tests take the step's shell script out of
// the workflow file and run it, so they exercise the script that ships, not a copy of it.

const WORKFLOW = readFileSync(resolve(__dirname, "../.github/workflows/auto-release.yml"), "utf8");

// The lines of the step named `name`, up to the next step.
function stepLines(name: string): string[] {
  const lines = WORKFLOW.split("\n");
  const start = lines.indexOf(`      - name: ${name}`);
  expect(start, `step "${name}" not found`).toBeGreaterThan(-1);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("      - "));
  return rest.slice(0, end === -1 ? undefined : end);
}

const STEP = stepLines("Determine version bump");

// The body of the step's `run: |` block, with the YAML indent taken off.
function script(): string {
  const run = STEP.indexOf("        run: |");
  expect(run, "the step has no `run: |` block").toBeGreaterThan(-1);
  const body = STEP.slice(run + 1);
  for (const line of body) expect(line === "" || line.startsWith("          ")).toBe(true);
  return body.map((line) => line.slice(10)).join("\n");
}

function bump(pr: { title: string; labels?: string; author?: string }): string {
  const out = join(mkdtempSync(join(tmpdir(), "release-bump-")), "github-output");
  const result = spawnSync("bash", ["-c", script()], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GITHUB_OUTPUT: out,
      PR_TITLE: pr.title,
      PR_LABELS: pr.labels ?? "",
      PR_AUTHOR: pr.author ?? "MarkAC007",
    },
  });
  expect(result.status, result.stderr).toBe(0);
  const written = readFileSync(out, "utf8").trim().split("\n");
  expect(written, "the step must write exactly one bump").toHaveLength(1);
  return written[0];
}

const DEPENDABOT = "dependabot[bot]";

describe("auto-release.yml version bump", () => {
  it("holds a script that can run outside the workflow", () => {
    // No `${{ }}` in the script: values reach it through env, never by interpolation.
    expect(script()).not.toContain("${{");
    expect(script()).toContain("GITHUB_OUTPUT");
  });

  it("passes the pull request author to the script through env", () => {
    expect(STEP).toContain("          PR_AUTHOR: ${{ github.event.pull_request.user.login }}");
  });

  // Dependabot adds the repository's `minor` label by itself when a dependency moves by a minor
  // version. That is what turned three dependency updates into v4.3.0, v4.4.0 and v4.5.0.
  it.each([
    ["a GitHub Actions update", "ci: bump actions/setup-node from 7.0.0 to 7.1.0", "minor,dependencies"],
    ["a grouped npm update", "deps: bump the dev-dependencies group across 1 directory", "minor,dependencies"],
    ["an update labelled major", "deps: bump zod from 3.0.0 to 4.0.0", "major,dependencies"],
    ["an update with only the default label", "ci: bump softprops/action-gh-release", "dependencies"],
  ])("releases %s from Dependabot as a patch", (_what, title, labels) => {
    expect(bump({ title, labels, author: DEPENDABOT })).toBe("bump=patch");
  });

  it("still reads the title of a Dependabot pull request", () => {
    expect(bump({ title: "feat: something", labels: "dependencies", author: DEPENDABOT })).toBe("bump=minor");
  });

  it.each([
    ["minor", "minor", "bump=minor"],
    ["feature", "feature", "bump=minor"],
    ["major", "major", "bump=major"],
    ["type/breaking", "type/breaking", "bump=major"],
    ["patch", "patch", "bump=patch"],
  ])("honours the %s label on a pull request from a person", (_what, labels, expected) => {
    expect(bump({ title: "chore: tidy", labels })).toBe(expected);
  });

  it("lets a label outrank the title on a pull request from a person", () => {
    expect(bump({ title: "fix: a small thing", labels: "minor" })).toBe("bump=minor");
  });

  it.each([
    ["feat: add a tool", "bump=minor"],
    ["feat(objectives): add tools", "bump=minor"],
    ["feat!: drop a tool", "bump=major"],
    ["fix: correct a field", "bump=patch"],
    ["ci(release): gate releases", "bump=patch"],
    ["docs: explain", "bump=patch"],
  ])("with no label, reads the bump from the title %s", (title, expected) => {
    expect(bump({ title })).toBe(expected);
  });
});
