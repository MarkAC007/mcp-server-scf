import { ScfApiError } from "./errors.js";
import { PKG_NAME, PKG_VERSION } from "./version.js";

/**
 * Identify every outgoing call as MCP traffic. The platform's
 * `detect_action_source` treats `x-audit-source` as the trusted override and
 * otherwise sniffs the User-Agent, so without these two headers each write
 * this client makes is recorded in the audit trail as a plain `api_key`
 * change rather than an `mcp` one.
 */
/** Query-string values. Arrays are sent as repeated keys (`item_ids=a&item_ids=b`), the FastAPI list convention. */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

/** Add query params to a URL. Arrays become repeated keys (`item_ids=a&item_ids=b`), the FastAPI list convention; undefined/null are skipped. */
function appendParams(url: URL, params?: QueryParams): void {
  if (!params) return;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

const AUDIT_HEADERS: Record<string, string> = {
  "X-Audit-Source": "mcp",
  "User-Agent": `${PKG_NAME}/${PKG_VERSION}`,
};

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

const ORG_PATH_PATTERN = /^(\/organizations\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i;

export class ScfApiClient {
  private baseUrl: string;
  private apiKey: string;
  private soleOrgId: string | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  /**
   * Resolve the single organization this API key can access, if exactly one.
   * Used to self-heal org-scoped calls that arrive with a wrong/stale org_id
   * (e.g. a UUID remembered from before an instance re-provision).
   */
  private async resolveSoleOrgId(): Promise<string | null> {
    if (this.soleOrgId) return this.soleOrgId;
    try {
      const orgs = await this.request<Array<{ id: string }>>("GET", "/organizations", undefined, true);
      if (Array.isArray(orgs) && orgs.length === 1 && typeof orgs[0]?.id === "string") {
        this.soleOrgId = orgs[0].id;
        return this.soleOrgId;
      }
    } catch {
      // Resolution is best-effort; the original 403 will surface instead.
    }
    return null;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: QueryParams;
      body?: unknown;
    },
    noOrgRetry = false,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`);

    appendParams(url, options?.params);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...AUDIT_HEADERS,
    };

    // FastAPI endpoints that declare a Pydantic body parameter require
    // Content-Type: application/json and at least `{}` — send both for all
    // mutation methods so callers never hit a spurious 422 "body missing".
    const isMutation = method === "POST" || method === "PUT" || method === "PATCH";
    if (options?.body || isMutation) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: isMutation ? JSON.stringify(options?.body ?? {}) : undefined,
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        const raw = errorBody.detail ?? errorBody.error ?? errorBody.message;
        if (typeof raw === "string") {
          detail = raw;
        } else if (raw !== undefined && raw !== null) {
          detail = JSON.stringify(raw);
        }
      } catch {
        // Use status text as fallback
      }

      // Self-heal a stale/wrong org_id: when an org-scoped call is denied but
      // the key can access exactly one organization, retry once against it.
      // This never broadens access — the retry target is proven accessible.
      // GET only: rerouting a mutation would silently write into an
      // organization the caller never named, so mutations fail loudly instead
      // with both org ids so the caller can retry explicitly.
      if (response.status === 403 && !noOrgRetry) {
        const match = path.match(ORG_PATH_PATTERN);
        if (match) {
          const soleOrg = await this.resolveSoleOrgId();
          if (soleOrg && soleOrg.toLowerCase() !== match[2].toLowerCase()) {
            if (method === "GET") {
              console.error(
                `[mcp-server-scf] org_id ${match[2]} was denied; retrying with the key's sole accessible org ${soleOrg}`,
              );
              const healedPath = path.replace(ORG_PATH_PATTERN, `$1${soleOrg}$3`);
              return this.request<T>(method, healedPath, options, true);
            }
            throw new ScfApiError(
              `org_id ${match[2]} is not accessible to this API key, whose sole accessible organization is ${soleOrg}. ` +
                `This ${method} was NOT retried against ${soleOrg} — if that organization is the intended target, retry explicitly with its org_id`,
              403,
            );
          }
        }
      }

      throw new ScfApiError(detail, response.status);
    }

    // 204 No Content (engagement and auditor deletes) has no body at all —
    // response.json() on it throws a parse error that would surface as a
    // spurious failure for a call that actually succeeded.
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return null as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch an endpoint that answers with text rather than JSON — document
   * export renders markdown or HTML, not a JSON envelope. Returns the body
   * verbatim so the tool can hand it to the model as-is.
   */
  private async requestText(path: string, params?: QueryParams): Promise<{ content_type: string; body: string }> {
    const url = new URL(`${this.baseUrl}/api${path}`);
    appendParams(url, params);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/markdown, text/html, text/plain",
        ...AUDIT_HEADERS,
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        const raw = errorBody.detail ?? errorBody.error ?? errorBody.message;
        if (typeof raw === "string") {
          detail = raw;
        } else if (raw !== undefined && raw !== null) {
          detail = JSON.stringify(raw);
        }
      } catch {
        // Use status text as fallback
      }
      throw new ScfApiError(detail, response.status);
    }

    return {
      content_type: response.headers.get("content-type") ?? "text/plain",
      body: await response.text(),
    };
  }

  async get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async getText(path: string, params?: QueryParams): Promise<{ content_type: string; body: string }> {
    return this.requestText(path, params);
  }

  async post<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
    return this.request<T>("POST", path, { body, params });
  }

  async patch<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
    return this.request<T>("PATCH", path, { body, params });
  }

  async delete<T>(path: string, params?: QueryParams): Promise<T> {
    return this.request<T>("DELETE", path, { params });
  }

  async put<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
    return this.request<T>("PUT", path, { body, params });
  }
}

let _client: ScfApiClient | null = null;

export function getClient(): ScfApiClient {
  if (!_client) {
    const apiKey = process.env.SCF_API_KEY;
    const baseUrl = process.env.SCF_API_URL;

    // The hosted SaaS (uk.scfcontrolsplatform.app) is decommissioned — the
    // platform is self-hosted only, so there is no meaningful default URL.
    if (!baseUrl) {
      throw new Error(
        "SCF_API_URL environment variable is required. " +
          "The SCF Controls Platform is self-hosted: set SCF_API_URL to your own " +
          "instance's base URL (e.g. http://localhost:8000). " +
          "See https://github.com/MarkAC007/scf-controls-platform-oss to deploy one.",
      );
    }

    if (!apiKey) {
      throw new Error(
        "SCF_API_KEY environment variable is required. " +
          `Generate one in your self-hosted instance at ${baseUrl.replace(/\/+$/, "")}/settings/api-keys`,
      );
    }

    _client = new ScfApiClient({ baseUrl, apiKey });
  }
  return _client;
}
