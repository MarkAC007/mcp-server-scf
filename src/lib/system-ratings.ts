/**
 * System boundary ratings accepted by the platform (PIG R4): `SystemCreate.criticality` and
 * `SystemCreate.data_classification` patterns in its OpenAPI spec — the same scales the vendor record uses.
 * Single source for the Zod enums and the parameter prose in src/tools/capabilities.ts.
 * Drift against the platform is caught by `npm run scope:check` and tests/vocabularies.test.ts.
 */
export const SYSTEM_CRITICALITIES = ["low", "medium", "high", "critical"] as const;

/** Comma-separated list for `.describe()` prose. */
export const SYSTEM_CRITICALITIES_PROSE = SYSTEM_CRITICALITIES.join(", ");

export const DATA_CLASSIFICATIONS = ["public", "internal", "confidential", "restricted"] as const;

/** Comma-separated list for `.describe()` prose. */
export const DATA_CLASSIFICATIONS_PROSE = DATA_CLASSIFICATIONS.join(", ");
