import type {
  ApiErrorBody,
  AuditEventDto,
  BandViolationReportDto,
  CompensationReportDto,
  CreateEmployeeRequest,
  EmployeeDto,
  EmploymentStatus,
  GroupBy,
  ImportReportDto,
  Page,
  SalaryChangeRequest,
  SalaryDto,
  UpdateEmployeeRequest,
} from "@salary/shared";

/** A failed request. Carries the server's error code so the UI can react to specific cases. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface EmployeeListQuery {
  search?: string;
  countryCode?: string;
  departmentName?: string;
  levelCode?: string;
  status?: EmploymentStatus;
  page?: number;
  pageSize?: number;
}

export interface ApiClientOptions {
  /** Returns the base64 "user:password" token, or null when signed out. */
  authorization: () => string | null;
  /** Injected for tests. Defaults to the global fetch, looked up at call time. */
  fetch?: FetchLike;
}

/** Drops undefined values so optional filters are simply absent from the query string. */
function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text === "" ? "" : `?${text}`;
}

/**
 * Typed client for the salary API. Every method's inputs and outputs come from @salary/shared,
 * so the web app and the API cannot drift apart without a compile error.
 */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  listEmployees(query: EmployeeListQuery = {}): Promise<Page<EmployeeDto>> {
    return this.getJson(`/api/employees${toQueryString({ ...query })}`);
  }

  getEmployee(id: string): Promise<EmployeeDto> {
    return this.getJson(`/api/employees/${encodeURIComponent(id)}`);
  }

  createEmployee(body: CreateEmployeeRequest): Promise<EmployeeDto> {
    return this.sendJson("POST", "/api/employees", body);
  }

  updateEmployee(id: string, patch: UpdateEmployeeRequest): Promise<EmployeeDto> {
    return this.sendJson("PATCH", `/api/employees/${encodeURIComponent(id)}`, patch);
  }

  changeSalary(id: string, body: SalaryChangeRequest): Promise<SalaryDto> {
    return this.sendJson("POST", `/api/employees/${encodeURIComponent(id)}/salary-changes`, body);
  }

  salaryHistory(id: string): Promise<{ items: SalaryDto[] }> {
    return this.getJson(`/api/employees/${encodeURIComponent(id)}/salary-history`);
  }

  auditTrail(id: string): Promise<{ items: AuditEventDto[] }> {
    return this.getJson(`/api/employees/${encodeURIComponent(id)}/audit`);
  }

  compensation(groupBy: GroupBy, asOf?: string): Promise<CompensationReportDto> {
    return this.getJson(`/api/analytics/compensation${toQueryString({ groupBy, asOf })}`);
  }

  bandViolations(asOf?: string): Promise<BandViolationReportDto> {
    return this.getJson(`/api/analytics/band-violations${toQueryString({ asOf })}`);
  }

  importEmployees(csv: string, dryRun: boolean): Promise<ImportReportDto> {
    const query = toQueryString({ dryRun: dryRun ? "true" : undefined });
    return this.request<ImportReportDto>("POST", `/api/employees/import${query}`, {
      rawBody: csv,
      contentType: "text/csv",
    });
  }

  exportCsv(filters: Omit<EmployeeListQuery, "page" | "pageSize"> = {}): Promise<string> {
    return this.requestText(`/api/employees/export.csv${toQueryString({ ...filters })}`);
  }

  private getJson<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private sendJson<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
    return this.request<T>(method, path, { jsonBody: body });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: { jsonBody?: unknown; rawBody?: string; contentType?: string },
  ): Promise<T> {
    const response = await this.send(method, path, body);
    const text = await response.text();
    const data = parseBody(text);
    if (!response.ok) {
      throw toApiError(response.status, data);
    }
    return data as T;
  }

  private async requestText(path: string): Promise<string> {
    const response = await this.send("GET", path);
    const text = await response.text();
    if (!response.ok) {
      throw toApiError(response.status, parseBody(text));
    }
    return text;
  }

  private send(
    method: string,
    path: string,
    body?: { jsonBody?: unknown; rawBody?: string; contentType?: string },
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json, text/csv" };
    const token = this.options.authorization();
    if (token !== null) {
      headers["Authorization"] = `Basic ${token}`;
    }

    let payload: string | undefined;
    if (body?.rawBody !== undefined) {
      headers["Content-Type"] = body.contentType ?? "text/plain";
      payload = body.rawBody;
    } else if (body?.jsonBody !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body.jsonBody);
    }

    const doFetch = this.options.fetch ?? globalThis.fetch.bind(globalThis);
    return doFetch(path, { method, headers, ...(payload === undefined ? {} : { body: payload }) });
  }
}

/** Parses a response body, returning undefined for empty or non-JSON text (e.g. an HTML error page). */
function parseBody(text: string): unknown {
  if (text === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function toApiError(status: number, data: unknown): ApiError {
  const error = (data as Partial<ApiErrorBody> | undefined)?.error;
  if (error && typeof error.code === "string" && typeof error.message === "string") {
    return new ApiError(status, error.code, error.message, error.details);
  }
  return new ApiError(status, "HTTP_ERROR", `The request failed (${String(status)})`);
}

/** Base64 of a UTF-8 string, for the Basic authorization token. btoa alone rejects non-Latin-1 text. */
export function toBase64(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
