# Contributing to mcp-server-scf

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Test with MCP Inspector: `SCF_API_KEY=your_key npm run inspector`

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

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (Node version, OS, MCP client)
