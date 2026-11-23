import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, toBase64 } from "./client.js";

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
  token: string | null = "dG9rZW4=",
): ApiClient {
  return new ApiClient({ authorization: () => token, fetch });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ApiClient requests", () => {
  it("sends the Basic authorization header and returns the parsed body", async () => {
    const { fetch, calls } = fakeFetch(jsonResponse({ items: [], total: 0, page: 1, pageSize: 1 }));

    const page = await clientWith(fetch).listEmployees({ pageSize: 1 });

    expect(page.total).toBe(0);
    expect(calls[0]?.url).toBe("/api/employees?pageSize=1");
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe("Basic dG9rZW4=");
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

describe("toBase64", () => {
  it("encodes plain ASCII credentials", () => {
    expect(toBase64("hr:secret")).toBe(Buffer.from("hr:secret").toString("base64"));
  });

  it("encodes non-Latin-1 characters as UTF-8", () => {
    expect(toBase64("Müller:pässwörd")).toBe(
      Buffer.from("Müller:pässwörd", "utf8").toString("base64"),
    );
  });
});
