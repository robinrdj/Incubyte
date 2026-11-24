import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { App } from "./App.js";
import { AuthProvider } from "./auth/AuthContext.js";

const USERNAME = "hr";
const PASSWORD = "correct-horse-battery";
const EXPECTED_AUTH = `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * A fake API for these flows. It accepts one set of credentials and rejects everything else with 401.
 * Only the employee list is needed, because that is what the sign-in check calls.
 */
function fakeApi(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("Authorization");
      if (auth !== EXPECTED_AUTH) {
        return Promise.resolve(
          json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401),
        );
      }
      if (url.startsWith("/api/employees")) {
        return Promise.resolve(json({ items: [], total: 0, page: 1, pageSize: 1 }, 200));
      }
      return Promise.resolve(json({ error: { code: "NOT_STUBBED", message: "not stubbed" } }, 404));
    }),
  );
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
  username: string,
  password: string,
): Promise<void> {
  await user.type(screen.getByLabelText(/^username/i), username);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  window.sessionStorage.clear();
  fakeApi();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("sign-in", () => {
  it("shows the sign-in form when signed out, at any address", () => {
    renderApp("/employees");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("shows the navigation after signing in with valid credentials", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await signIn(user, USERNAME, PASSWORD);

    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Employees" })).toBeInTheDocument();
  });

  it("shows a clear message for wrong credentials and stays on the form", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await signIn(user, USERNAME, "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password.");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("keeps the session across a reload within the same tab", async () => {
    const user = userEvent.setup();
    const first = renderApp("/");
    await signIn(user, USERNAME, PASSWORD);
    await screen.findByRole("navigation", { name: "Main navigation" });
    first.unmount();

    renderApp("/analytics");

    expect(await screen.findByRole("heading", { name: "Analytics", level: 2 })).toBeInTheDocument();
  });

  it("signs out and returns to the sign-in form", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, USERNAME, PASSWORD);
    await screen.findByRole("navigation", { name: "Main navigation" });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("salary.session")).toBeNull();
  });
});

describe("navigation", () => {
  it("sends the root address to the employees section", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, USERNAME, PASSWORD);

    expect(await screen.findByRole("heading", { name: "Employees", level: 2 })).toBeInTheDocument();
  });

  it("moves between sections from the navigation", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, USERNAME, PASSWORD);
    await screen.findByRole("navigation", { name: "Main navigation" });

    await user.click(screen.getByRole("link", { name: "Analytics" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Analytics", level: 2 })).toBeInTheDocument(),
    );
  });

  it("shows a not-found page for an unknown address", async () => {
    const user = userEvent.setup();
    renderApp("/no-such-page");
    await signIn(user, USERNAME, PASSWORD);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
