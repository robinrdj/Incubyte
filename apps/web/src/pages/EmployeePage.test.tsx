import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { installFakeApi, type RecordedRequest } from "../test-utils/fakeApi.js";
import {
  REFERENCE,
  SALARY_HISTORY,
  bandReport,
  employee,
  renderAt,
  signedIn,
} from "../test-utils/render.js";
import { EmployeePage } from "./EmployeePage.js";

const ID = "11111111-1111-4111-8111-111111111111";
const ADDRESS = `/employees/${ID}`;

function renderProfile() {
  return renderAt(
    ADDRESS,
    <Routes>
      <Route path="/employees/:id" element={<EmployeePage />} />
    </Routes>,
  );
}

function standardRoutes(overrides: Parameters<typeof installFakeApi>[0] = []) {
  // The first matching route wins, so overrides are placed before the defaults.
  return installFakeApi([
    ...overrides,
    { method: "GET", path: `/api/employees/${ID}`, body: employee() },
    { method: "GET", path: `/api/employees/${ID}/salary-history`, body: { items: SALARY_HISTORY } },
    { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    { method: "GET", path: "/api/reference", body: REFERENCE },
  ]);
}

let recorded: RecordedRequest[];

function requestsTo(method: string, path: string): RecordedRequest[] {
  return recorded.filter((r) => r.method === method && r.url === path);
}

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("employee profile", () => {
  it("shows the details, current salary, and salary history", async () => {
    recorded = standardRoutes();
    renderProfile();

    expect(
      await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("ada@acme.test")).toBeInTheDocument();
    expect(screen.getByText("€96,000.00", { selector: "p" })).toBeInTheDocument();
    expect(await screen.findByText(/\(current\)/)).toBeInTheDocument();
    expect(screen.getByText("€90,000.00")).toBeInTheDocument();
  });

  it("shows a pay band badge when the employee is outside their band", async () => {
    recorded = standardRoutes([
      {
        method: "GET",
        path: "/api/analytics/band-violations",
        body: bandReport([
          {
            employeeId: ID,
            employeeCode: "EMP-000001",
            firstName: "Ada",
            lastName: "Lovelace",
            countryCode: "DE",
            departmentName: "Engineering",
            levelCode: "L3",
            salary: { amount: "96000.00", currency: "EUR", usd: "103680.00" },
            band: { minUsd: "88000.00", maxUsd: "132000.00" },
            position: "BELOW",
            compaRatio: 0.94,
          },
        ]),
      },
    ]);
    renderProfile();

    expect(await screen.findByText("Below band")).toBeInTheDocument();
  });

  it("says so when the employee does not exist", async () => {
    installFakeApi([
      {
        method: "GET",
        path: `/api/employees/${ID}`,
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Employee not found" } },
      },
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
    renderProfile();

    expect(await screen.findByRole("heading", { name: "Employee not found" })).toBeInTheDocument();
  });
});

describe("editing the profile", () => {
  it("sends only the fields that changed", async () => {
    recorded = standardRoutes([
      {
        method: "PATCH",
        path: `/api/employees/${ID}`,
        body: employee({ jobTitle: "Senior Engineer" }),
      },
    ]);
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const jobTitle = screen.getByLabelText(/^job title/i);
    await user.clear(jobTitle);
    await user.type(jobTitle, "Senior Engineer");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(requestsTo("PATCH", `/api/employees/${ID}`)[0]?.body).toEqual({
        jobTitle: "Senior Engineer",
      });
    });
    expect(await screen.findByRole("button", { name: "Edit profile" })).toBeInTheDocument();
  });

  it("sends nothing when the form is saved without changes", async () => {
    recorded = standardRoutes();
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Edit profile" })).toBeInTheDocument();
    expect(recorded.some((r) => r.method === "PATCH")).toBe(false);
  });

  it("shows the server's message when the change conflicts", async () => {
    recorded = standardRoutes([
      {
        method: "PATCH",
        path: `/api/employees/${ID}`,
        status: 409,
        body: {
          error: { code: "CONFLICT", message: "An employee with this email already exists" },
        },
      },
    ]);
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const email = screen.getByLabelText(/^email/i);
    await user.clear(email);
    await user.type(email, "grace@acme.test");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An employee with this email already exists",
    );
  });

  it("stops the edit form from accepting an invalid email", async () => {
    recorded = standardRoutes();
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const email = screen.getByLabelText(/^email/i);
    await user.clear(email);
    await user.type(email, "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(recorded.some((r) => r.method === "PATCH")).toBe(false);
  });
});

describe("recording a salary change", () => {
  it("posts the new salary and refreshes the history", async () => {
    recorded = standardRoutes([
      {
        method: "POST",
        path: `/api/employees/${ID}/salary-changes`,
        status: 201,
        body: { amount: "100000.00", currency: "EUR", effectiveFrom: "2026-06-01" },
      },
    ]);
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.type(screen.getByLabelText(/^new salary/i), "100000.00");
    fireEvent.change(screen.getByLabelText(/^effective from/i), {
      target: { value: "2026-06-01" },
    });
    await user.click(screen.getByRole("button", { name: "Record salary change" }));

    await waitFor(() => {
      expect(requestsTo("POST", `/api/employees/${ID}/salary-changes`)[0]?.body).toEqual({
        amount: "100000.00",
        currency: "EUR",
        effectiveFrom: "2026-06-01",
      });
    });
  });

  it("refuses a salary that does not take effect after the current one, without sending it", async () => {
    recorded = standardRoutes();
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.type(screen.getByLabelText(/^new salary/i), "100000.00");
    fireEvent.change(screen.getByLabelText(/^effective from/i), {
      target: { value: "2025-01-15" },
    });
    await user.click(screen.getByRole("button", { name: "Record salary change" }));

    expect(
      await screen.findByText("Must be after the current salary date (2025-01-15)"),
    ).toBeInTheDocument();
    expect(recorded.some((r) => r.method === "POST")).toBe(false);
  });

  it("shows the server's message when the change is rejected", async () => {
    recorded = standardRoutes([
      {
        method: "POST",
        path: `/api/employees/${ID}/salary-changes`,
        status: 422,
        body: {
          error: { code: "UNPROCESSABLE", message: "effectiveFrom cannot be in the future" },
        },
      },
    ]);
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "Ada Lovelace", level: 2 });

    await user.type(screen.getByLabelText(/^new salary/i), "100000.00");
    fireEvent.change(screen.getByLabelText(/^effective from/i), {
      target: { value: "2026-06-01" },
    });
    await user.click(screen.getByRole("button", { name: "Record salary change" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("effectiveFrom cannot be in the future")).toBeInTheDocument();
  });
});
