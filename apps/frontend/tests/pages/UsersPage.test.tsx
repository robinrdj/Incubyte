import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersPage } from "../../src/pages/UsersPage.js";
import { installFakeApi, type RecordedRequest } from "../support/fake-api.js";
import { TEST_USER, renderAt, signedIn } from "../support/render.js";

const COLLEAGUE = {
  id: "88888888-8888-4888-8888-888888888888",
  name: "Priya Nair",
  email: "priya.nair@acme.test",
  createdAt: "2026-11-20T09:00:00.000Z",
  createdBy: TEST_USER.email,
};

let recorded: RecordedRequest[];

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
  recorded = installFakeApi([
    { method: "GET", path: "/api/users", body: { items: [TEST_USER, COLLEAGUE] } },
    {
      method: "POST",
      path: "/api/users",
      status: 201,
      body: { ...COLLEAGUE, id: "77777777-7777-4777-8777-777777777777", name: "Lena Weber" },
    },
  ]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HR users", () => {
  it("lists HR users, who added them, and marks the signed-in user", async () => {
    renderAt("/users", <UsersPage />);

    const table = await screen.findByRole("table", { name: "HR users" });
    const me = within(table).getByText(TEST_USER.name).closest("tr");
    const colleague = within(table).getByText(COLLEAGUE.name).closest("tr");
    expect(me).toHaveTextContent("You");
    expect(me).toHaveTextContent("First account");
    expect(colleague).toHaveTextContent(TEST_USER.email);
  });

  it("adds a user and confirms it", async () => {
    const user = userEvent.setup();
    renderAt("/users", <UsersPage />);
    await screen.findByRole("table", { name: "HR users" });

    await user.click(screen.getByRole("button", { name: "Add HR user" }));
    const form = await screen.findByRole("form", { name: "Add HR user" });
    await user.type(within(form).getByLabelText(/^name/i), "Lena Weber");
    await user.type(within(form).getByLabelText(/^email/i), "lena.weber@acme.test");
    await user.type(within(form).getByLabelText(/^initial password/i), "a-long-password-1");
    await user.click(within(form).getByRole("button", { name: "Add HR user" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Lena Weber can now sign in");
    expect(recorded.find((r) => r.method === "POST")?.body).toEqual({
      name: "Lena Weber",
      email: "lena.weber@acme.test",
      password: "a-long-password-1",
    });
  });

  it("checks the form before calling the API", async () => {
    const user = userEvent.setup();
    renderAt("/users", <UsersPage />);
    await screen.findByRole("table", { name: "HR users" });

    await user.click(screen.getByRole("button", { name: "Add HR user" }));
    const form = await screen.findByRole("form", { name: "Add HR user" });
    await user.type(within(form).getByLabelText(/^initial password/i), "short");
    await user.click(within(form).getByRole("button", { name: "Add HR user" }));

    expect(await within(form).findByText("Enter their name.")).toBeInTheDocument();
    expect(within(form).getByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(recorded.some((r) => r.method === "POST")).toBe(false);
  });
});
