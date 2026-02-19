# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-02-19

### Fixed
- Release workflow now uses Node 24 (required for npm OIDC trusted publishing)

## [0.1.1] - 2026-02-19

### Changed
- Switched to npm OIDC trusted publishing (no static tokens)
- Added provenance attestation for supply chain security
- Release workflow validates tag matches package.json version

### Security
- CI: Gitleaks secret detection, CodeQL analysis, Semgrep SAST
- Dependabot: Weekly dependency and GitHub Actions updates
- Branch protection with required status checks

## [0.1.0] - 2026-02-19

### Added
- Initial release of mcp-server-scf
- 35+ MCP tools across 8 domains: Catalog, Control Scoping, Evidence, Risk, Vendors, Organization, Capabilities, Systems
- Full SCF Controls Platform API coverage
- Claude Desktop, Claude Code, Cursor/Windsurf, and Docker support
- TypeScript strict mode with Zod schema validation
- Structured error handling with `errorResult()`
- npm package publishing (`mcp-server-scf`)
- Docker image support (`markac007/mcp-server-scf`)

### Security
- API keys never logged or included in error messages
- All communication over HTTPS
- SHA-256 key hashing server-side
- Rate limiting: 100 req/min (read), 20 req/min (write)
- Multi-tenant organization scoping
