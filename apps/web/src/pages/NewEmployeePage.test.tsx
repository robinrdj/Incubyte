import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { installFakeApi, type RecordedRequest } from "../test-utils/fakeApi.js";
import { REFERENCE, employee, renderAt, signedIn } from "../test-utils/render.js";
import { NewEmployeePage } from "./NewEmployeePage.js";

const NEW_ID = "33333333-3333-4333-8333-333333333333";

function renderNew() {
  return renderAt(
    "/employees/new",
    <Routes>
      <Route path="/employees/new" element={<NewEmployeePage />} />
      <Route path="/employees/:id" element={<p>Profile for {NEW_ID}</p>} />
    </Routes>,
  );
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/^employee code/i), "emp-000042");
  await user.type(screen.getByLabelText(/^first name/i), "Margaret");
  await user.type(screen.getByLabelText(/^last name/i), "Hamilton");
  await user.type(screen.getByLabelText(/^email/i), "Margaret@Acme.test");
  await user.type(screen.getByLabelText(/^job title/i), "Engineer");
  await user.click(screen.getByRole("combobox", { name: /^country/i }));
  await user.click(await screen.findByText("Germany"));
  await user.click(screen.getByRole("combobox", { name: /^department/i }));
  await user.click(await screen.findByText("Engineering"));
  await user.click(screen.getByRole("combobox", { name: /^level/i }));
  await user.click(await screen.findByText("L3"));
  fireEvent.change(screen.getByLabelText(/^start date/i), { target: { value: "2024-03-01" } });
  await user.type(screen.getByLabelText(/^opening salary/i), "90000.00");
  await user.click(screen.getByRole("combobox", { name: /^currency/i }));
  await user.click(await screen.findByText("EUR"));
  fireEvent.change(screen.getByLabelText(/^salary effective from/i), {
    target: { value: "2024-03-01" },
  });
}

let recorded: RecordedRequest[];

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
  recorded = installFakeApi([{ method: "GET", path: "/api/reference", body: REFERENCE }]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("adding an employee", () => {
  it("asks for the required fields instead of sending an empty form", async () => {
    const user = userEvent.setup();
    renderNew();
    await screen.findByLabelText(/^employee code/i);

    await user.click(screen.getByRole("button", { name: "Create employee" }));

    expect(await screen.findAllByText("Required")).not.toHaveLength(0);
    expect(recorded.some((r) => r.method === "POST")).toBe(false);
  });

  it("rejects an email that is not valid", async () => {
    const user = userEvent.setup();
    renderNew();
    await screen.findByLabelText(/^email/i);

    await user.type(screen.getByLabelText(/^email/i), "margaret.acme");
    await user.click(screen.getByRole("button", { name: "Create employee" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("rejects a salary with more than two decimal places", async () => {
    const user = userEvent.setup();
    renderNew();
    await screen.findByLabelText(/^opening salary/i);

    await user.type(screen.getByLabelText(/^opening salary/i), "90000.123");
    await user.click(screen.getByRole("button", { name: "Create employee" }));

    expect(
      await screen.findByText("Enter an amount such as 90000.00 (up to two decimals)"),
    ).toBeInTheDocument();
  });

  it("creates the employee with normalized values, then opens the profile", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "POST", path: "/api/employees", status: 201, body: employee({ id: NEW_ID }) },
    ]);
    const user = userEvent.setup();
    renderNew();
    await screen.findByLabelText(/^employee code/i);
    await fillRequired(user);

    await user.click(screen.getByRole("button", { name: "Create employee" }));

    expect(await screen.findByText(`Profile for ${NEW_ID}`)).toBeInTheDocument();
    const post = recorded.find((r) => r.method === "POST");
    expect(post?.body).toEqual({
      employeeCode: "EMP-000042",
      firstName: "Margaret",
      lastName: "Hamilton",
      email: "margaret@acme.test",
      jobTitle: "Engineer",
      countryCode: "DE",
      departmentName: "Engineering",
      levelCode: "L3",
      startDate: "2024-03-01",
      salary: { amount: "90000.00", currency: "EUR", effectiveFrom: "2024-03-01" },
    });
  });

  it("shows a duplicate email from the server and stays on the form", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      {
        method: "POST",
        path: "/api/employees",
        status: 409,
        body: {
          error: { code: "CONFLICT", message: "An employee with this email already exists" },
        },
      },
    ]);
    const user = userEvent.setup();
    renderNew();
    await screen.findByLabelText(/^employee code/i);
    await fillRequired(user);

    await user.click(screen.getByRole("button", { name: "Create employee" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An employee with this email already exists",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create employee" })).toBeEnabled(),
    );
  });
});
