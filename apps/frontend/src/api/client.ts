import type {
  ApiErrorBody,
  AuditEventDto,
  BandViolationQuery,
  BandViolationReportDto,
  CompensationReportDto,
  CreateEmployeeRequest,
  CreateHrUserRequest,
  EmployeeDto,
  EmploymentStatus,
  FxRateDto,
  FxRateListDto,
  GroupBy,
  HrUserDto,
  ImportReportDto,
  Page,
  PayBandDto,
  ReferenceDataDto,
  SalaryChangeRequest,
  SalaryDto,
  SaveFxRateRequest,
  SavePayBandRequest,
  SessionDto,
  SignInRequest,
  UpdateEmployeeRequest,
} from "@salary/shared";

/** A failed request, carrying the server's error code so the UI can react to specific cases. */
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
  /** The current session token, or null when signed out. */
  token: () => string | null;
  /** Defaults to the global fetch, looked up at call time so tests can replace it. */
  fetch?: FetchLike;
  /** Where the API lives. Empty means the same origin, as in development through the Vite proxy. */
  baseUrl?: string;
  /** Called when a signed-in request is rejected, for example because the session expired. */
  onUnauthorized?: () => void;
}

/** The API address from VITE_API_BASE_URL at build time, without a trailing slash. */
export function apiBaseUrl(env: Record<string, unknown> = import.meta.env): string {
  const value = env["VITE_API_BASE_URL"];
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

/** Leaves out undefined and empty values, so unset filters are absent from the query string. */
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

/** Typed client for the API. Request and response types come from @salary/shared. */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  signIn(body: SignInRequest): Promise<SessionDto> {
    return this.sendJson("POST", "/api/session", body);
  }

  signOut(): Promise<void> {
    return this.request("DELETE", "/api/session");
  }

  listUsers(): Promise<{ items: HrUserDto[] }> {
    return this.getJson("/api/users");
  }

  createUser(body: CreateHrUserRequest): Promise<HrUserDto> {
    return this.sendJson("POST", "/api/users", body);
  }

  reference(): Promise<ReferenceDataDto> {
    return this.getJson("/api/reference");
  }

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

  bandViolations(query: BandViolationQuery = {}): Promise<BandViolationReportDto> {
    const params = toQueryString({
      asOf: query.asOf,
      employeeIds: query.employeeIds?.join(","),
      position: query.position,
      page: query.page,
      pageSize: query.pageSize,
    });
    return this.getJson(`/api/analytics/band-violations${params}`);
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

  fxRates(): Promise<FxRateListDto> {
    return this.getJson("/api/settings/fx-rates");
  }

  saveFxRate(body: SaveFxRateRequest): Promise<FxRateDto> {
    return this.sendJson("PUT", "/api/settings/fx-rates", body);
  }

  payBands(): Promise<{ items: PayBandDto[] }> {
    return this.getJson("/api/settings/pay-bands");
  }

  savePayBand(
    countryCode: string,
    levelCode: string,
    body: SavePayBandRequest,
  ): Promise<PayBandDto> {
    const path = `/api/settings/pay-bands/${encodeURIComponent(countryCode)}/${encodeURIComponent(levelCode)}`;
    return this.sendJson("PUT", path, body);
  }

  private getJson<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private sendJson<T>(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<T> {
    return this.request<T>(method, path, { jsonBody: body });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: { jsonBody?: unknown; rawBody?: string; contentType?: string },
  ): Promise<T> {
    const response = await this.send(method, path, body);
    const data = parseBody(await response.text());
    if (!response.ok) {
      throw this.failure(response.status, data);
    }
    return data as T;
  }

  private async requestText(path: string): Promise<string> {
    const response = await this.send("GET", path);
    const text = await response.text();
    if (!response.ok) {
      throw this.failure(response.status, parseBody(text));
    }
    return text;
  }

  private failure(status: number, data: unknown): ApiError {
    if (status === 401 && this.options.token() !== null) {
      this.options.onUnauthorized?.();
    }
    return toApiError(status, data);
  }

  private send(
    method: string,
    path: string,
    body?: { jsonBody?: unknown; rawBody?: string; contentType?: string },
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json, text/csv" };
    const token = this.options.token();
    if (token !== null) {
      headers["Authorization"] = `Bearer ${token}`;
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
    const url = `${this.options.baseUrl ?? ""}${path}`;
    return doFetch(url, { method, headers, ...(payload === undefined ? {} : { body: payload }) });
  }
}

/** Returns undefined for an empty or non-JSON body, such as an HTML error page from a proxy. */
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
