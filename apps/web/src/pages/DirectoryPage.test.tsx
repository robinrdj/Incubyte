import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type RecordedRequest } from "../test-utils/fakeApi.js";
import { REFERENCE, bandReport, employee, renderAt, signedIn } from "../test-utils/render.js";
import { DirectoryPage } from "./DirectoryPage.js";

const ADA = employee();
const GRACE = employee({
  id: "22222222-2222-4222-8222-222222222222",
  employeeCode: "EMP-000002",
  firstName: "Grace",
  lastName: "Hopper",
  email: "grace@acme.test",
  country: { code: "IN", name: "India" },
  currentSalary: { amount: "2500000.00", currency: "INR", effectiveFrom: "2024-02-01" },
});

function page(items: unknown[], total = items.length, pageNumber = 1) {
  return { items, total, page: pageNumber, pageSize: 25 };
}

let recorded: RecordedRequest[];

function directoryRequests(): URL[] {
  return recorded
    .filter((r) => r.url.startsWith("/api/employees?"))
    .map((r) => new URL(r.url, "http://localhost"));
}

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("employee directory", () => {
  it("lists employees with their current salary", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA, GRACE]) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);

    renderAt("/employees", <DirectoryPage />);

    const table = await screen.findByRole("table", { name: "Employees" });
    expect(within(table).getByRole("link", { name: "EMP-000001" })).toHaveAttribute(
      "href",
      `/employees/${ADA.id}`,
    );
    expect(within(table).getByText("€96,000.00")).toBeInTheDocument();
    expect(within(table).getByText("₹2,500,000.00")).toBeInTheDocument();
  });

  it("marks employees outside their pay band", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA, GRACE]) },
      {
        method: "GET",
        path: "/api/analytics/band-violations",
        body: bandReport([
          {
            employeeId: GRACE.id,
            employeeCode: "EMP-000002",
            firstName: "Grace",
            lastName: "Hopper",
            countryCode: "IN",
            departmentName: "Finance",
            levelCode: "L3",
            salary: { amount: "2500000.00", currency: "INR", usd: "30000.00" },
            band: { minUsd: "24000.00", maxUsd: "36000.00" },
            position: "ABOVE",
            compaRatio: 1.2,
          },
        ]),
      },
    ]);

    renderAt("/employees", <DirectoryPage />);

    const table = await screen.findByRole("table", { name: "Employees" });
    const graceRow = within(table).getByText("Grace Hopper").closest("tr");
    expect(graceRow).not.toBeNull();
    expect(within(graceRow as HTMLElement).getByText("Above band")).toBeInTheDocument();
    const adaRow = within(table).getByText("Ada Lovelace").closest("tr");
    expect(within(adaRow as HTMLElement).queryByText("Above band")).not.toBeInTheDocument();
  });

  it("sends the search term to the API after a short pause", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA]) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
    const user = userEvent.setup();
    renderAt("/employees", <DirectoryPage />);
    await screen.findByRole("table", { name: "Employees" });

    await user.type(screen.getByLabelText("Search"), "lovelace");

    await waitFor(() => {
      expect(directoryRequests().some((url) => url.searchParams.get("search") === "lovelace")).toBe(
        true,
      );
    });
  });

  it("filters by country and returns to the first page", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA], 60, 1) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
    const user = userEvent.setup();
    renderAt("/employees", <DirectoryPage />);
    await screen.findByRole("table", { name: "Employees" });

    await user.click(screen.getByRole("combobox", { name: /^country/i }));
    await user.click(await screen.findByText("India"));

    await waitFor(() => {
      expect(
        directoryRequests().some(
          (url) =>
            url.searchParams.get("countryCode") === "IN" && url.searchParams.get("page") === "1",
        ),
      ).toBe(true);
    });
  });

  it("moves to the next page of results", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA], 60, 1) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
    const user = userEvent.setup();
    renderAt("/employees", <DirectoryPage />);
    await screen.findByText("Showing 1–25 of 60");

    await user.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(directoryRequests().some((url) => url.searchParams.get("page") === "2")).toBe(true);
    });
  });

  it("shows an empty state when nothing matches", async () => {
    installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([]) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);

    renderAt("/employees", <DirectoryPage />);

    expect(await screen.findByText("No employees match these filters.")).toBeInTheDocument();
  });

  it("shows a clear error when the list cannot be loaded", async () => {
    installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      {
        method: "GET",
        path: "/api/employees",
        status: 500,
        body: { error: { code: "INTERNAL", message: "boom" } },
      },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);

    renderAt("/employees", <DirectoryPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
