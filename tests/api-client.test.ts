import { afterEach, describe, expect, it, vi } from "vitest";
import { ScfApiClient } from "../src/lib/api-client.js";
import { ScfApiError } from "../src/lib/errors.js";

const STALE_ORG = "6a1dad6d-0000-4000-8000-000000000000";
const SOLE_ORG = "8ba6022e-b09a-4d7f-9b38-fa4c53bfb675";
const OTHER_ORG = "11111111-2222-4333-8444-555555555555";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Install a fetch mock that returns 403 for org-scoped calls naming STALE_ORG,
 * serves /organizations from `orgs`, and succeeds for calls naming SOLE_ORG.
 * Returns the list of {method, url} the client actually issued.
 */
function mockBackend(orgs: Array<{ id: string }>) {
  const calls: Array<{ method: string; url: string }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url });
      if (url.includes(`/organizations/${STALE_ORG}`)) {
        return jsonResponse(403, { detail: "Not a member of this organization" });
      }
      if (url.endsWith("/api/organizations")) {
        return jsonResponse(200, orgs);
      }
      return jsonResponse(200, { ok: true, url, method });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("403 org self-heal", () => {
  it("retries a denied GET against the key's sole accessible org", async () => {
    const calls = mockBackend([{ id: SOLE_ORG }]);
    const client = new ScfApiClient({ baseUrl: "https://scf.example.com", apiKey: "scf_test" });

    const result = await client.get<{ ok: boolean; url: string }>(`/organizations/${STALE_ORG}/vendors`);

    expect(result.ok).toBe(true);
    expect(result.url).toContain(`/organizations/${SOLE_ORG}/vendors`);
    expect(calls.map((c) => c.method)).toEqual(["GET", "GET", "GET"]);
  });

  it("never reroutes a mutation: a denied POST throws naming both org ids", async () => {
    const calls = mockBackend([{ id: SOLE_ORG }]);
    const client = new ScfApiClient({ baseUrl: "https://scf.example.com", apiKey: "scf_test" });

    const attempt = client.post(`/organizations/${STALE_ORG}/vendors`, { name: "Acme" });

    await expect(attempt).rejects.toThrowError(ScfApiError);
    await expect(client.post(`/organizations/${STALE_ORG}/vendors`, { name: "Acme" })).rejects.toThrowError(
      new RegExp(`${STALE_ORG}.*${SOLE_ORG}.*NOT retried`, "s"),
    );
    // No request was ever issued against the sole org's path.
    expect(calls.some((c) => c.url.includes(`/organizations/${SOLE_ORG}/`))).toBe(false);
  });

  it("keeps the platform's own 403 detail when the key can access multiple orgs", async () => {
    mockBackend([{ id: SOLE_ORG }, { id: OTHER_ORG }]);
    const client = new ScfApiClient({ baseUrl: "https://scf.example.com", apiKey: "scf_test" });

    await expect(client.post(`/organizations/${STALE_ORG}/vendors`, { name: "Acme" })).rejects.toThrowError(
      /Not a member of this organization/,
    );
  });

  it("keeps the platform's own 403 detail for a denied DELETE with a sole-org key", async () => {
    const calls = mockBackend([{ id: SOLE_ORG }]);
    const client = new ScfApiClient({ baseUrl: "https://scf.example.com", apiKey: "scf_test" });

    await expect(client.delete(`/organizations/${STALE_ORG}/vendors/abc`)).rejects.toThrowError(
      new RegExp(`NOT retried`),
    );
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
  });
});

describe("empty and non-JSON responses", () => {
  it("resolves a 204 to null instead of failing to parse an empty body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const client = new ScfApiClient({ baseUrl: "https://scf.test", apiKey: "k" });
    await expect(client.delete(`/organizations/${SOLE_ORG}/engagements/${OTHER_ORG}`)).resolves.toBeNull();
  });

  it("resolves a 200 with an explicit zero content-length to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200, headers: { "Content-Length": "0" } })),
    );
    const client = new ScfApiClient({ baseUrl: "https://scf.test", apiKey: "k" });
    await expect(client.get(`/organizations/${SOLE_ORG}/engagements`)).resolves.toBeNull();
  });

  it("getText returns markdown verbatim with its content type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("# Policy\n\nBody text.", {
            status: 200,
            headers: { "Content-Type": "text/markdown; charset=utf-8" },
          }),
      ),
    );
    const client = new ScfApiClient({ baseUrl: "https://scf.test", apiKey: "k" });
    const out = await client.getText(`/organizations/${SOLE_ORG}/documents/${OTHER_ORG}/export`, {
      format: "md",
    });
    expect(out.body).toBe("# Policy\n\nBody text.");
    expect(out.content_type).toContain("text/markdown");
  });

  it("getText surfaces a platform error detail as ScfApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(404, { detail: "Document not found" })),
    );
    const client = new ScfApiClient({ baseUrl: "https://scf.test", apiKey: "k" });
    await expect(client.getText(`/organizations/${SOLE_ORG}/documents/${OTHER_ORG}/export`)).rejects.toThrow(
      ScfApiError,
    );
  });

  it("getText sends the format query parameter", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        seen.push(String(input));
        return new Response("<h1>Policy</h1>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }),
    );
    const client = new ScfApiClient({ baseUrl: "https://scf.test", apiKey: "k" });
    await client.getText(`/organizations/${SOLE_ORG}/documents/${OTHER_ORG}/export`, {
      format: "html",
    });
    expect(seen[0]).toContain("format=html");
  });
});
