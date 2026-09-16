/**
 * Canonical system-type vocabulary for `scf_create_system` / `scf_update_system`.
 *
 * Mirrors the platform's `backend/services/system_catalog_validation.py` SYSTEM_TYPE_LIST,
 * which is also the source of the OpenAPI `pattern` on `SystemCreate.system_type`. This is
 * the one place the list lives on the MCP side: the Zod enum, the tool prose and the drift
 * tests all derive from it.
 *
 * Drift is caught twice: `npm run scope:check` compares this list with the spec it is given,
 * and `tests/vocabularies.test.ts` compares it with the platform pattern captured in
 * `tests/fixtures/platform-system-type-pattern.json`. When the platform adds a type, update
 * the fixture and this list together.
 */
export const SYSTEM_TYPES = [
  "cloud_provider",
  "identity_provider",
  "ticketing",
  "logging",
  "security_tool",
  "code_repository",
  "document_management",
  "endpoint_management",
  "vulnerability_management",
  "email_security",
  "security_awareness",
  "password_manager",
  "communication",
  "hr_system",
  "custom",
] as const;

export type SystemTypeValue = (typeof SYSTEM_TYPES)[number];

/** Comma-separated list for `.describe()` prose so the prose can never disagree with the enum. */
export const SYSTEM_TYPES_PROSE = SYSTEM_TYPES.join(", ");
