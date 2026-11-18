#!/usr/bin/env node
/* eslint-disable no-console */
// Release gate: refuse to release a commit unless every required check passed on it.
//
// auto-release.yml runs on every merged pull request. The checks that ran on the
// pull request ran on the branch, before the merge; the commit that is tagged and
// published is the merge commit on main, and CI and the security scans run on it
// again when it is pushed. This gate reads the check runs GitHub holds for that
// exact commit and lets the release continue only when each required check has
// concluded `success`.
//
//   - `success` is the only passing result. `skipped`, `neutral`, `cancelled`,
//     `timed_out` and `failure` all refuse: a check that did not run has not passed.
//   - A check that is still running, or has not been created yet (the release job
//     and the push run start at the same moment), is waited for. If it has not
//     finished when the wait runs out, the gate refuses.
//   - The newest run of a name decides, so a re-run replaces the run it repeats.
//   - Only check runs created by GitHub Actions count. A check with the same name
//     posted by another app cannot satisfy the gate.
//   - If the check runs cannot be read, the gate refuses. No answer is not a pass.
//
// The names in REQUIRED_CHECKS are the job names GitHub shows on the commit.
// tests/release-gates.test.ts holds them to the names ci.yml and security.yml
// produce, so a renamed job fails a pull request instead of blocking a release.
//
// Usage: node scripts/release-checks-gate.mjs        (from the repo root, in the checkout being released)
// Env:   REQUIRED_CHECKS=<name>|<name>|...            required; check-run names, separated by "|"
//        GATE_REPO=<owner>/<name>                     default GITHUB_REPOSITORY
//        GATE_SHA=<40-hex commit>                     default `git rev-parse HEAD`
//        GATE_WAIT_SECONDS=<n>                        how long to wait for unfinished checks (default 1200)
//        GATE_POLL_SECONDS=<n>                        pause between reads (default 30)
//        CHECK_RUNS_FILE=<path>                       read a saved JSON array of check runs instead of calling gh (tests)
//        GH_TOKEN                                     read by `gh`; needs `checks: read` on the repository
//
// Exit:  0 every required check is `success`
//        1 a required check is not `success`, or did not finish in time
//        2 the gate could not run (bad input, or the check runs could not be read)

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const IN_ACTIONS = process.env.GITHUB_ACTIONS === "true";

function stop(code, message) {
  console.error(`release-checks-gate: ${message}`);
  // One annotation on the run page, so the reason is visible without opening the log.
  if (IN_ACTIONS) console.log(`::error::release gate: ${message}`);
  process.exit(code);
}

// --- input -----------------------------------------------------------------
const required = [
  ...new Set(
    (process.env.REQUIRED_CHECKS ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];
if (required.length === 0) stop(2, 'REQUIRED_CHECKS is empty (expected check-run names separated by "|")');

const repo = process.env.GATE_REPO ?? process.env.GITHUB_REPOSITORY ?? "";
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  stop(2, `GATE_REPO "${repo}" is not an owner/name repository`);
}

let sha = process.env.GATE_SHA;
if (sha === undefined) {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (head.error || head.status !== 0) stop(2, "could not resolve HEAD with `git rev-parse HEAD`");
  sha = head.stdout.trim();
}
if (!/^[0-9a-f]{40}$/.test(sha)) stop(2, `GATE_SHA "${sha}" is not a full 40-character commit sha`);

function seconds(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!/^\d+$/.test(raw)) stop(2, `${name} "${raw}" is not a whole number of seconds`);
  return Number(raw);
}
const waitSeconds = seconds("GATE_WAIT_SECONDS", 20 * 60);
const pollSeconds = Math.max(1, seconds("GATE_POLL_SECONDS", 30));

// --- read the check runs ----------------------------------------------------
// Returns { runs } or { error }. A run is { id, name, status, conclusion, html_url, app }.
function validate(runs) {
  if (!Array.isArray(runs)) return { error: "check runs are not a list" };
  for (const r of runs) {
    if (
      !r ||
      typeof r !== "object" ||
      !Number.isSafeInteger(r.id) ||
      typeof r.name !== "string" ||
      typeof r.status !== "string"
    ) {
      return { error: `unexpected check run record: ${JSON.stringify(r)?.slice(0, 200)}` };
    }
  }
  return { runs };
}

function readCheckRuns() {
  if (process.env.CHECK_RUNS_FILE) {
    try {
      return validate(JSON.parse(readFileSync(process.env.CHECK_RUNS_FILE, "utf8")));
    } catch (err) {
      return { error: `cannot read CHECK_RUNS_FILE ${process.env.CHECK_RUNS_FILE}: ${err.message}` };
    }
  }
  // --paginate with --jq prints one JSON object per line across every page.
  const api = spawnSync(
    "gh",
    [
      "api",
      `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
      "--paginate",
      "--jq",
      ".check_runs[] | {id, name, status, conclusion, html_url, app: .app.slug}",
    ],
    // A stalled connection must not outlast the wait: the deadline is only looked at between reads.
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
  );
  if (api.error) return { error: `could not run gh: ${api.error.message}` };
  if (api.status !== 0) return { error: `gh api failed (exit ${api.status}): ${api.stderr?.trim().slice(0, 500)}` };
  try {
    return validate(
      api.stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line)),
    );
  } catch {
    return { error: "could not parse the check runs gh returned" };
  }
}

// --- decide ----------------------------------------------------------------
// The state of each required name, taken from its newest GitHub Actions run.
// Check-run ids only ever increase, so the highest id is the newest run. The
// start time is not used: a queued re-run has none yet.
function evaluate(runs) {
  return required.map((name) => {
    const newest = runs
      .filter((r) => r.app === "github-actions" && r.name === name)
      .reduce((a, b) => (a === null || b.id > a.id ? b : a), null);
    let state;
    if (newest === null) state = "missing";
    else if (newest.status !== "completed") state = "pending";
    else state = typeof newest.conclusion === "string" && newest.conclusion ? newest.conclusion : "unknown";
    return { name, state, url: newest?.html_url ?? "" };
  });
}

console.log(
  `release-checks-gate: ${repo} at ${sha}; required: ${required.join(", ")}; ` +
    `waiting up to ${waitSeconds}s for unfinished checks`,
);

const deadline = Date.now() + waitSeconds * 1000;
for (;;) {
  const { runs, error } = readCheckRuns();
  let waiting = [];
  if (error) {
    console.error(`release-checks-gate: ${error}`);
  } else {
    const states = evaluate(runs);
    for (const s of states) console.log(`  ${s.state.toUpperCase().padEnd(10)} ${s.name}${s.url ? `  ${s.url}` : ""}`);

    const bad = states.filter((s) => !["success", "pending", "missing"].includes(s.state));
    if (bad.length) {
      stop(
        1,
        `FAIL — not green at ${sha}: ${bad.map((s) => `${s.name}=${s.state}`).join("; ")}. ` +
          "Nothing was tagged or published. Fix or re-run the check on that commit, then re-run this job; " +
          "the newest run of each check decides.",
      );
    }
    waiting = states.filter((s) => s.state !== "success");
    if (waiting.length === 0) {
      console.log(`release-checks-gate: PASS — every required check is green at ${sha}.`);
      process.exit(0);
    }
  }

  if (Date.now() >= deadline) {
    if (error) {
      stop(
        2,
        `FAIL — could not read the check runs for ${sha} (${error}). Nothing was tagged or published. ` +
          "An unread result is not a pass; re-run this job.",
      );
    }
    stop(
      1,
      `FAIL — gave up after ${waitSeconds}s waiting on: ${waiting.map((s) => `${s.name} (${s.state})`).join(", ")} ` +
        `at ${sha}. Nothing was tagged or published. If the checks are still running, re-run this job once they ` +
        "have finished. A check that never appears means the push run on main did not start (a commit message " +
        "with a skip-ci marker does that; the next merge then releases this commit too), or a job was renamed " +
        "without updating REQUIRED_CHECKS in auto-release.yml.",
    );
  }
  console.log(
    error
      ? `release-checks-gate: retrying in ${pollSeconds}s`
      : `release-checks-gate: waiting ${pollSeconds}s on: ${waiting.map((s) => s.name).join(", ")}`,
  );
  await sleep(pollSeconds * 1000);
}
