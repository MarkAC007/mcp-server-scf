/**
 * Deficiency vocabularies accepted by the platform (PIG R8): `DeficiencyCreate.priority` and
 * `DeficiencyUpdate.status` patterns in its OpenAPI spec. Capability-test findings use the same priorities.
 * Single source for the Zod enums and the parameter prose in src/tools/assurance.ts.
 * Drift against the platform is caught by `npm run scope:check` and tests/vocabularies.test.ts.
 */
export const DEFICIENCY_PRIORITIES = ["critical", "high", "medium", "low"] as const;

/** Comma-separated list for `.describe()` prose. */
export const DEFICIENCY_PRIORITIES_PROSE = DEFICIENCY_PRIORITIES.join(", ");

export const DEFICIENCY_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;

/** Comma-separated list for `.describe()` prose. */
export const DEFICIENCY_STATUSES_PROSE = DEFICIENCY_STATUSES.join(", ");
