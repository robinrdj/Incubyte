import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, apiBaseUrl } from "../../src/api/client.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fetch double that records each request and returns the given response. */
function fakeFetch(response: Response) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetch = vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(response.clone());
  });
  return { fetch, calls };
}

function clientWith(
  fetch: ReturnType<typeof fakeFetch>["fetch"],
  token: string | null = "session-token",
): ApiClient {
  return new ApiClient({ token: () => token, fetch });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ApiClient requests", () => {
  it("sends the session token and returns the parsed body", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ items: [], total: 0, page: 1, pageSize: 1 }));

    const page = await clientWith(fetch).listEmployees({ pageSize: 1 });

    expect(page.total).toBe(0);
    expect(calls[0]?.url).toBe("/api/employees?pageSize=1");
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe("Bearer session-token");
  });

  it("sends no authorization header when signed out", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ status: "ok" }));
    await clientWith(fetch, null).listEmployees();
    expect(new Headers(calls[0]?.init?.headers).has("Authorization")).toBe(false);
  });

  it("omits undefined filters from the query string", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ groups: [] }));
    await clientWith(fetch).compensation("country", undefined);
    expect(calls[0]?.url).toBe("/api/analytics/compensation?groupBy=country");
  });

  it("sends JSON bodies with a JSON content type", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ id: "1" }, 201));
    await clientWith(fetch).changeSalary("abc", {
      amount: "1.00",
      currency: "EUR",
      effectiveFrom: "2025-01-01",
    });

    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toBe("/api/employees/abc/salary-changes");
    expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("application/json");
    const body = calls[0]?.init?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toMatchObject({ currency: "EUR" });
  });

  it("uploads CSV as text/csv and passes the dry-run flag", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ dryRun: true }));
    await clientWith(fetch).importEmployees("a,b\r\n1,2", true);

    expect(calls[0]?.url).toBe("/api/employees/import?dryRun=true");
    expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("text/csv");
    expect(calls[0]?.init?.body).toBe("a,b\r\n1,2");
  });

  it("returns exported CSV as text", async () => {
    const { fetch } = fakeFetch(new Response("employeeCode\r\nEMP-000001\r\n", { status: 200 }));
    await expect(clientWith(fetch).exportCsv({ countryCode: "DE" })).resolves.toContain(
      "EMP-000001",
    );
  });
});

describe("ApiClient errors", () => {
  it("turns the server's error body into a typed ApiError", async () => {
    const { fetch } = fakeFetch(
      jsonResponse({ error: { code: "NOT_FOUND", message: "Employee not found" } }, 404),
    );

    const error = await clientWith(fetch)
      .getEmployee("00000000-0000-4000-8000-000000000000")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "NOT_FOUND", message: "Employee not found" });
  });

  it("keeps field-level details from validation errors", async () => {
    const details = [{ field: "salary.amount", message: "must be a positive amount" }];
    const { fetch } = fakeFetch(
      jsonResponse(
        { error: { code: "VALIDATION_FAILED", message: "The request is invalid", details } },
        400,
      ),
    );

    const error = await clientWith(fetch)
      .listEmployees()
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 400, details });
  });

  it("falls back to a generic error when the body is not JSON, such as an HTML error page", async () => {
    const { fetch } = fakeFetch(new Response("<html>Bad gateway</html>", { status: 502 }));

    const error = await clientWith(fetch)
      .listEmployees()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "HTTP_ERROR" });
  });
});

describe("hosting the API on another address", () => {
  it("sends requests to the configured API address", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ items: [], total: 0, page: 1, pageSize: 1 }));
    const client = new ApiClient({
      token: () => "session-token",
      fetch,
      baseUrl: "https://api.example.test",
    });

    await client.listEmployees({ pageSize: 1 });

    expect(calls[0]?.url).toBe("https://api.example.test/api/employees?pageSize=1");
  });

  it.each([
    [{ VITE_API_BASE_URL: "https://api.example.test/" }, "https://api.example.test"],
    [{ VITE_API_BASE_URL: "  https://api.example.test//  " }, "https://api.example.test"],
    [{ VITE_API_BASE_URL: "" }, ""],
    [{}, ""],
  ])("reads the API address from %j", (env, expected) => {
    expect(apiBaseUrl(env)).toBe(expected);
  });
});

describe("sessions", () => {
  it("signs in without a token and returns the new session", async () => {
    const { fetch, calls } = fakeFetch(
      jsonResponse({ token: "new-token", expiresAt: "2026-11-25T00:00:00Z", user: {} }, 201),
    );

    const session = await clientWith(fetch, null).signIn({ email: "a@b.test", password: "pw" });

    expect(session.token).toBe("new-token");
    expect(calls[0]?.url).toBe("/api/session");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBeNull();
  });

  it("reports an expired session so the app can sign out", async () => {
    const { fetch } = fakeFetch(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "Sign in to continue" } }, 401),
    );
    const onUnauthorized = vi.fn();
    const client = new ApiClient({ token: () => "expired", fetch, onUnauthorized });

    await expect(client.reference()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not treat a wrong password at sign-in as an expired session", async () => {
    const { fetch } = fakeFetch(
      jsonResponse({ error: { code: "INVALID_CREDENTIALS", message: "Incorrect" } }, 401),
    );
    const onUnauthorized = vi.fn();
    const client = new ApiClient({ token: () => null, fetch, onUnauthorized });

    await expect(client.signIn({ email: "a@b.test", password: "x" })).rejects.toThrow();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
