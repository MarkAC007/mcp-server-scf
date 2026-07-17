export class ScfApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
  ) {
    super(message);
    this.name = "ScfApiError";
  }
}

export function formatError(error: unknown): string {
  if (error instanceof ScfApiError) {
    if (error.statusCode === 401) return "Authentication failed. Check your SCF_API_KEY.";
    if (error.statusCode === 403)
      return (
        `Access denied by the platform: ${error.message}. ` +
        "If this is an organization-scoped call, the org_id may be wrong or stale — " +
        "call scf_list_organizations to see which organization(s) this API key can access, then retry with that org_id."
      );
    if (error.statusCode === 404) return `Not found: ${error.message}`;
    if (error.statusCode === 429) return "Rate limited. Please wait before retrying.";
    if (error.statusCode === 402) return "Usage limit reached on your instance. Check its plan/limits configuration.";
    return `API error (${error.statusCode}): ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function errorResult(error: unknown) {
  return {
    content: [{ type: "text" as const, text: formatError(error) }],
    isError: true,
  };
}
