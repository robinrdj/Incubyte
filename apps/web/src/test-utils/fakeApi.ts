import { vi } from "vitest";

export interface FakeRoute {
  method: string;
  /** Path without the query string, for example "/api/employees". */
  path: string;
  status?: number;
  body: unknown;
}

export interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
}

/**
 * Replaces global fetch with a router over the given routes. Requests that match no route get a 404,
 * which makes a missing stub visible in the test instead of silently passing.
 * Every request is recorded so tests can assert on what was sent.
 */
export function installFakeApi(routes: FakeRoute[]): RecordedRequest[] {
  const recorded: RecordedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const path = input.split("?")[0] ?? input;
      const rawBody = typeof init?.body === "string" ? init.body : undefined;
      const parsedBody: unknown = rawBody === undefined ? undefined : parseJson(rawBody);
      recorded.push({ method, url: input, body: parsedBody });

      const route = routes.find((r) => r.method === method && r.path === path);
      const status = route?.status ?? (route ? 200 : 404);
      const body = route?.body ?? {
        error: { code: "NOT_STUBBED", message: `No stub for ${method} ${path}` },
      };
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );
  return recorded;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
