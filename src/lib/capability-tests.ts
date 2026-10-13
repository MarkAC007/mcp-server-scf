/**
 * Capability-test vocabularies accepted by the platform (PIG R11): `CapabilityTestCreate.test_type` and
 * `CapabilityTestCreate.result` patterns in its OpenAPI spec.
 * Single source for the Zod enums and the parameter prose in src/tools/assurance.ts.
 * Drift against the platform is caught by `npm run scope:check` and tests/vocabularies.test.ts.
 */
export const CAPABILITY_TEST_TYPES = ["incident_response", "continuity", "other"] as const;

/** Comma-separated list for `.describe()` prose. */
export const CAPABILITY_TEST_TYPES_PROSE = CAPABILITY_TEST_TYPES.join(", ");

export const CAPABILITY_TEST_RESULTS = ["passed", "passed_with_findings", "failed"] as const;

/** Comma-separated list for `.describe()` prose. */
export const CAPABILITY_TEST_RESULTS_PROSE = CAPABILITY_TEST_RESULTS.join(", ");
