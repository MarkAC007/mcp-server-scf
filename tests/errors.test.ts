import { describe, it, expect } from "vitest";
import { ScfApiError, formatError, errorResult } from "../src/lib/errors.js";

describe("formatError", () => {
  it("translates 401 into an auth hint", () => {
    const msg = formatError(new ScfApiError("unauthorised", 401));
    expect(msg).toMatch(/SCF_API_KEY/);
  });

  it("translates 403 into an access-denied hint", () => {
    const msg = formatError(new ScfApiError("forbidden", 403));
    expect(msg).toMatch(/Access denied/);
  });

  it("translates 404 into a not-found string with the message", () => {
    const msg = formatError(new ScfApiError("risk 9e2... not found", 404));
    expect(msg).toMatch(/Not found: risk 9e2/);
  });

  it("translates 429 into a rate-limit hint", () => {
    const msg = formatError(new ScfApiError("too fast", 429));
    expect(msg).toMatch(/Rate limited/);
  });

  it("translates 402 into a subscription-upgrade hint", () => {
    const msg = formatError(new ScfApiError("over limit", 402));
    expect(msg).toMatch(/Subscription limit reached/);
  });

  it("falls through to the generic shape for other status codes", () => {
    const msg = formatError(new ScfApiError("something broke", 503));
    expect(msg).toBe("API error (503): something broke");
  });

  it("handles non-ScfApiError Error instances", () => {
    expect(formatError(new Error("boom"))).toBe("boom");
  });

  it("handles unknown non-Error values", () => {
    expect(formatError("weird")).toBe("weird");
    expect(formatError(42)).toBe("42");
  });
});

describe("errorResult", () => {
  it("returns the MCP error shape with isError=true", () => {
    const result = errorResult(new ScfApiError("forbidden", 403));
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toMatch(/Access denied/);
  });

  it("never leaks the raw error object", () => {
    const err = new ScfApiError("should-not-appear", 401, "AUTH_FAILED");
    const result = errorResult(err);
    // the api-key-sensitive code path must not reflect the caller-facing
    // message verbatim — we sanitise it via formatError
    expect(result.content[0].text).not.toBe(err.message);
  });
});
