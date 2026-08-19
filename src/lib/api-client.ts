import { ScfApiError } from "./errors.js";

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
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    },
    noOrgRetry = false,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
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

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, { body });
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
