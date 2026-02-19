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

Releases are automated via GitHub Actions with npm trusted publishing (OIDC — no static tokens).

### How to release

1. Update `version` in `package.json`
2. Update `CHANGELOG.md` with the new version and changes
3. Commit: `git commit -am "chore: bump version to X.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push origin main --tags`

The release workflow will:
- Validate the tag matches `package.json` version
- Build and type-check
- Publish to npm with [provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
- Create a GitHub Release with auto-generated notes

### Security

- **No static npm tokens** — uses GitHub Actions OIDC for authentication
- **Provenance** — every published package is cryptographically linked to its source commit
- **Version lockstep** — the workflow fails if the git tag doesn't match `package.json`

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (Node version, OS, MCP client)
