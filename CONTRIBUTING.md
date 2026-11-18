# Contributing to mcp-server-scf

Thank you for your interest in contributing! Here's how to get started.

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1).

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install` (automatically installs the husky pre-commit hook via the `prepare` script)
3. Build: `npm run build`
4. Test with MCP Inspector: `SCF_API_KEY=your_key npm run inspector`

### Everyday scripts

| Script                 | What it does                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run build`        | Type-check + compile to `build/`                                                                                                                                   |
| `npm run dev`          | Watch-mode rebuild with `tsx`                                                                                                                                      |
| `npm run lint`         | Run ESLint on the repo                                                                                                                                             |
| `npm run lint:fix`     | ESLint with `--fix`                                                                                                                                                |
| `npm run format`       | Run Prettier `--write` on the repo                                                                                                                                 |
| `npm run format:check` | Run Prettier `--check` (CI-friendly)                                                                                                                               |
| `npm run inspector`    | Launch MCP Inspector against the built server                                                                                                                      |
| `npm run scope:check`  | Reconcile the platform OpenAPI spec (`--spec <file>` or localhost:8000) with `docs/tool-scope.json`, the code and the vocabulary modules; see `docs/tool-scope.md` |

### Pre-commit hook

A `husky` + `lint-staged` pre-commit hook automatically runs `eslint --fix` and `prettier --write` on **staged files only** — no full-repo passes on every commit. If a violation can't be auto-fixed, the commit is aborted so you can address it. Bypass with `git commit --no-verify` only in emergencies; CI will still enforce lint + format on the PR.

## Adding a New Tool

1. Find or create the appropriate file in `src/tools/`
2. Add your tool using `server.tool()` with:
   - A `snake_case` name
   - A clear description (what it does, when to use it)
   - Zod schema for all parameters with `.describe()` on each
   - Error handling via `errorResult()`
3. If creating a new tool file, register it in `src/index.ts`
4. Run `npm run build` to verify compilation

## Code Style

- TypeScript strict mode
- All tool parameters must have `.describe()` annotations
- Use `errorResult()` for all error responses
- Never write to stdout (stdio transport) — use `console.error()` for logs

## Pull Requests

- Keep PRs focused on a single change
- Include a clear description of what changed and why
- Ensure `npm run build` passes with no errors

## Release Process

Releases use two separate GitHub Actions workflows — version bumping and npm publishing are decoupled so you control when each happens.

### Step 1: Version Bump

Go to **Actions → Version Bump → Run workflow** and provide:

- **Bump type:** patch, minor, or major
- **Changelog entry:** what changed

This creates a PR with the bumped version and updated CHANGELOG. Merge the PR to main.

### Step 2: Publish to npm

Go to **Actions → Publish to npm → Run workflow**. The version is read from `package.json` on main automatically (or you can override it).

This will:

- Validate the version matches `package.json`
- Verify the version isn't already published
- Create a git tag if one doesn't exist
- Build, lint, type-check
- Publish to npm with [provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
- Create a GitHub Release

### Why two steps?

Version bumping goes through a PR (respects branch protection). Publishing to npm is a separate manual trigger. This lets you:

- Batch multiple merges before bumping the version
- Review the version PR before merging
- Publish when ready, not on every merge

### Security

- **No static npm tokens** — uses GitHub Actions OIDC for authentication
- **Provenance** — every published package is cryptographically linked to its source commit
- **Version lockstep** — publish fails if the tag doesn't match `package.json`
- **Duplicate protection** — publish fails if the version already exists on npm

### Release gates

The release job (`.github/workflows/auto-release.yml`) runs two gates before it pushes a tag, publishes to npm or the MCP Registry, or creates a GitHub Release. If either refuses, nothing has been made public.

1. **Green checks on the commit being released** (`scripts/release-checks-gate.mjs`). The checks on a pull request ran on its branch. The release is built from the merge commit on `main`, where CI and the security scans run again. The gate waits for those runs and continues only when every required check (`build (20)`, `build (22)`, `Secret Detection`, `Registry Signature Verification`, `CodeQL Analysis`, `SAST Scan`) concluded `success` on that commit. `skipped` is refused, a check that has not finished within 20 minutes is refused, and a result that cannot be read is refused.
2. **Dependency audit** (`scripts/audit-gate.mjs`). The same script and policy as the CI "Audit dependencies" step, run again on the tree about to be published. A high or critical advisory stops the release unless it has a reasoned, unexpired entry in `.github/audit-exceptions.json`; an expired entry stops it too.

When a gate refuses:

- **A check failed or did not run on the merge commit:** fix or re-run that check, then re-run the release job. The newest run of each check decides.
- **An advisory blocks:** upgrade the dependency, or record a dated exception with its reason, in a pull request. Merging it releases the earlier change together with the fix.

The list of required checks is written in `auto-release.yml` (`REQUIRED_CHECKS`), because the workflow token cannot read branch protection. Keep it in step with the required status checks on `main`; `tests/release-gates.test.ts` fails when it names a check no workflow produces, or leaves out a CI build.

Release jobs run one at a time (`concurrency: auto-release` on the job). Each one works out its version from the tags it sees when it starts, and the tag is pushed only after the gates have waited, so two releases running together could pick the same version.

`.github/workflows/audit-nightly.yml` runs the same audit on `main` every night. It blocks nothing; a red run means a new advisory, or an exception that has run out, will stop the next pull request and the next release.

## Reporting Issues

Open an issue on GitHub with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (Node version, OS, MCP client)
