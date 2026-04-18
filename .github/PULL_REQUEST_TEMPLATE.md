<!--
Thanks for contributing to mcp-server-scf!

Before you open this PR, please make sure:
  - It targets a single concern (bug fix, feature, docs, chore, etc.).
  - The pre-commit hook (husky + lint-staged) ran cleanly on your commits.
  - You have NOT bumped the version in `package.json` or added a CHANGELOG entry by hand — that is handled by the two-step release workflow after merge. See CONTRIBUTING.md §"Release Process".
-->

## Summary

<!-- What changed, in one or two sentences. -->

## Linked issues

<!-- `Closes #123`, `Refs #456`. Every PR should link at least one issue. -->

Closes #

## Type of change

<!-- Tick one. -->

- [ ] `fix` — bug fix (no breaking change)
- [ ] `feat` — new functionality (no breaking change)
- [ ] `feat!` / `fix!` — breaking change
- [ ] `docs` — documentation only
- [ ] `chore` — tooling, dependencies, CI, build
- [ ] `test` — test suite only
- [ ] `refactor` — internal change, no behaviour change

## Checklist

- [ ] `npm run lint` passes locally.
- [ ] `npm run format:check` passes locally (or `npm run format` was run).
- [ ] `npm run build` passes (TypeScript strict mode, no errors).
- [ ] `npm test` passes locally.
- [ ] If I added or removed a tool, the tool-count badge / README table reflects the new total and the README tool-count drift check still passes.
- [ ] New tools follow the existing pattern: `snake_case` name, Zod schema with `.describe()` on every field, errors via `errorResult()`, no `console.log`.
- [ ] I have **not** edited `package.json` version or `CHANGELOG.md` — the Version Bump workflow will do that after merge.
- [ ] I have **not** pushed to `main` directly; this PR is from a feature branch.

## Screenshots / sample output

<!-- Optional. For UX-visible changes (error messages, README rendering, MCP Inspector output) a screenshot or paste helps reviewers. -->

## Additional notes

<!-- Anything reviewers should know: trade-offs considered, follow-up work intentionally deferred, risks. -->
