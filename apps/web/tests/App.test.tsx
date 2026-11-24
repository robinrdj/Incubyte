import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";
import { AuthProvider } from "../src/auth/AuthContext.js";

const EMAIL = "hr.manager@acme.test";
const PASSWORD = "correct-horse-battery";
const TOKEN = "session-token";
const USER = {
  id: "99999999-9999-4999-8999-999999999999",
  name: "Test HR",
  email: EMAIL,
  createdAt: "2026-11-01T09:00:00.000Z",
  createdBy: null,
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Accepts one email and password at sign-in, then only requests that carry the issued token. */
function fakeApi(): ReturnType<typeof vi.fn> {
  const fetch = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/session" && init?.method === "POST") {
      const body = JSON.parse(init.body as string) as { email: string; password: string };
      return Promise.resolve(
        body.email === EMAIL && body.password === PASSWORD
          ? json({ token: TOKEN, expiresAt: "2026-11-25T00:00:00Z", user: USER }, 201)
          : json({ error: { code: "INVALID_CREDENTIALS", message: "Incorrect" } }, 401),
      );
    }
    if (new Headers(init?.headers).get("Authorization") !== `Bearer ${TOKEN}`) {
      return Promise.resolve(json({ error: { code: "UNAUTHORIZED", message: "Sign in" } }, 401));
    }
    if (url === "/api/session" && init?.method === "DELETE") {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (url.startsWith("/api/employees")) {
      return Promise.resolve(json({ items: [], total: 0, page: 1, pageSize: 25 }, 200));
    }
    return Promise.resolve(json({ error: { code: "NOT_STUBBED", message: "not stubbed" } }, 404));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderApp(initialPath = "/") {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
): Promise<void> {
  await user.type(screen.getByLabelText(/^email/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

let fetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubEnv("VITE_HIDE_DEMO_ACCOUNT", "true");
  fetch = fakeApi();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sign-in", () => {
  it("shows the sign-in form when signed out, at any address", () => {
    renderApp("/employees");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("shows the navigation after signing in", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await signIn(user, EMAIL, PASSWORD);

    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HR users" })).toBeInTheDocument();
  });

  it("accepts the email in any letter case", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await signIn(user, "HR.Manager@ACME.test", PASSWORD);

    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("shows a clear message for a wrong password and stays on the form", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await signIn(user, EMAIL, "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("asks for a valid email without calling the API", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await signIn(user, "hr", PASSWORD);

    expect(await screen.findByText("Enter your work email address.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the session across a reload within the same tab", async () => {
    const user = userEvent.setup();
    const first = renderApp("/");
    await signIn(user, EMAIL, PASSWORD);
    await screen.findByRole("navigation", { name: "Main navigation" });
    first.unmount();

    renderApp("/analytics");

    expect(await screen.findByRole("heading", { name: "Analytics", level: 2 })).toBeInTheDocument();
  });

  it("signs out from the account menu and returns to the sign-in form", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, EMAIL, PASSWORD);
    await screen.findByRole("navigation", { name: "Main navigation" });

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(await screen.findByText("Sign out"));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("salary.session")).toBeNull();
  });

  it("returns to the sign-in form when the session has expired", async () => {
    window.sessionStorage.setItem(
      "salary.session",
      JSON.stringify({ token: "expired-token", user: USER }),
    );

    renderApp("/employees");

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("demo account", () => {
  it("is shown by default and signs in with one click", async () => {
    vi.stubEnv("VITE_HIDE_DEMO_ACCOUNT", "");
    vi.stubEnv("VITE_DEMO_EMAIL", EMAIL);
    vi.stubEnv("VITE_DEMO_PASSWORD", PASSWORD);
    const user = userEvent.setup();
    renderApp("/");

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByText(PASSWORD)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign in with the demo account" }));

    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("can be hidden for a deployment with real data", () => {
    renderApp("/");

    expect(
      screen.queryByRole("button", { name: "Sign in with the demo account" }),
    ).not.toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("sends the root address to the employees section", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, EMAIL, PASSWORD);

    expect(await screen.findByRole("heading", { name: "Employees", level: 2 })).toBeInTheDocument();
  });

  it("moves between sections from the navigation", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, EMAIL, PASSWORD);
    await screen.findByRole("navigation", { name: "Main navigation" });

    await user.click(screen.getByRole("link", { name: "Analytics" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Analytics", level: 2 })).toBeInTheDocument();
    });
  });

  it("shows a not-found page for an unknown address", async () => {
    const user = userEvent.setup();
    renderApp("/no-such-page");
    await signIn(user, EMAIL, PASSWORD);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
