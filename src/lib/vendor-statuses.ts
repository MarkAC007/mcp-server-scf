/**
 * Vendor lifecycle statuses accepted by the platform (`VendorCreate.status` pattern in its OpenAPI spec).
 * Single source for the Zod enums and the parameter prose in src/tools/vendors.ts.
 * Drift against the platform is caught by `npm run scope:check` and tests/vocabularies.test.ts.
 */
export const VENDOR_STATUSES = ["prospect", "active", "under_review", "approved", "suspended", "offboarded"] as const;

export type VendorStatusValue = (typeof VENDOR_STATUSES)[number];

/** Comma-separated list for `.describe()` prose. */
export const VENDOR_STATUSES_PROSE = VENDOR_STATUSES.join(", ");
