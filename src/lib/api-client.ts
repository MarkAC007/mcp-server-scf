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

export class ScfApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    },
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

    if (options?.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        detail = (errorBody.detail as string) || (errorBody.error as string) || detail;
      } catch {
        // Use status text as fallback
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
    const baseUrl = process.env.SCF_API_URL || "https://eu.scfcontrolsplatform.app";

    if (!apiKey) {
      throw new Error(
        "SCF_API_KEY environment variable is required. " +
          "Generate one at https://eu.scfcontrolsplatform.app/settings/api-keys",
      );
    }

    _client = new ScfApiClient({ baseUrl, apiKey });
  }
  return _client;
}
