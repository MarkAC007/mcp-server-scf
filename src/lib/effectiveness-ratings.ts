/**
 * Compensating-control effectiveness ratings accepted by the platform (PIG R9):
 * `CompensatingControlCreate.effectiveness_rating` pattern in its OpenAPI spec.
 * Single source for the Zod enums and the parameter prose in src/tools/assurance.ts.
 * Drift against the platform is caught by `npm run scope:check` and tests/vocabularies.test.ts.
 */
export const EFFECTIVENESS_RATINGS = ["full", "partial", "minimal"] as const;

/** Comma-separated list for `.describe()` prose. */
export const EFFECTIVENESS_RATINGS_PROSE = EFFECTIVENESS_RATINGS.join(", ");
