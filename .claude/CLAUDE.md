# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**mcp-server-scf** — MCP server for the SCF Controls Platform. Exposes 35+ tools for security compliance controls, frameworks, evidence, risk management, and vendor TPRM through the Model Context Protocol.

**Stack:** TypeScript 5, Node.js 18+, MCP SDK, Zod, ESM modules
**Published:** [npm](https://www.npmjs.com/package/mcp-server-scf) as `mcp-server-scf`

## Quick Commands

```bash
# Install dependencies
npm install

# Build (TypeScript → build/)
npm run build

# Development (watch mode with tsx)
npm run dev

# Lint
npm run lint

# Test with MCP Inspector
SCF_API_KEY=scf_your_key npm run inspector
```

## Architecture

```
src/
├── index.ts              # Server entry point (stdio transport)
├── tools/
│   ├── catalog.ts        # SCF reference data (read-only)
│   ├── scoped-controls.ts # Control implementation tracking
│   ├── evidence.ts       # Evidence collection
│   ├── risk.ts           # Risk register
│   ├── vendors.ts        # Third-party risk management
│   ├── organization.ts   # Org, users, audit, notifications
│   └── capabilities.ts   # KSI themes, systems
└── lib/
    ├── api-client.ts     # HTTP client with auth + error handling
    └── errors.ts         # Structured error responses
```

## Code Conventions

- **TypeScript strict mode** — all code must pass `tsc --noEmit`
- **ESM modules** — `"type": "module"` in package.json, Node16 module resolution
- **Tool registration** — use `server.tool()` with snake_case names
- **Parameter schemas** — every Zod field must have `.describe()` annotation
- **Error handling** — use `errorResult()` from `lib/errors.ts`, never throw
- **No stdout** — stdio transport means `console.log` breaks the protocol; use `console.error` for debug
- **API keys** — never log, never include in error messages

## Adding a New Tool

1. Find or create the appropriate file in `src/tools/`
2. Register with `server.tool(name, description, schema, handler)`
3. Use `apiClient.get()` / `apiClient.post()` from `lib/api-client.ts`
4. Handle errors with `errorResult()`
5. Import and call the registration function in `src/index.ts`
6. Run `npm run build` to verify

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SCF_API_KEY` | Yes | — | Platform API key (`scf_` prefix) |
| `SCF_API_URL` | No | `https://eu.scfcontrolsplatform.app` | Platform URL |
