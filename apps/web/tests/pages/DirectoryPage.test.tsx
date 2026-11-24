import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type RecordedRequest } from "../support/fake-api.js";
import { REFERENCE, bandReport, employee, renderAt, signedIn } from "../support/render.js";
import { Route, Routes } from "react-router";
import { DirectoryPage } from "../../src/pages/DirectoryPage.js";

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
    expect(within(table).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
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

describe("exporting from the directory", () => {
  it("exports exactly the employees the current filters show", async () => {
    const createObjectURL = vi.fn(() => "blob:test");
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA]) },
      { method: "GET", path: "/api/employees/export.csv", body: "employeeCode\r\nEMP-000002\r\n" },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
    const user = userEvent.setup();
    renderAt("/employees", <DirectoryPage />);
    await screen.findByRole("table", { name: "Employees" });

    await user.click(screen.getByRole("combobox", { name: /^country/i }));
    await user.click(await screen.findByText("India"));
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });
    const exportUrl = recorded.find((r) => r.url.startsWith("/api/employees/export.csv"))?.url;
    expect(exportUrl).toBe("/api/employees/export.csv?countryCode=IN");
    click.mockRestore();
  });

  it("cannot export when nothing matches", async () => {
    installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([]) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);

    renderAt("/employees", <DirectoryPage />);

    await screen.findByText("No employees match these filters.");
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });
});

describe("opening an employee", () => {
  function renderWithProfileRoute(): void {
    renderAt(
      "/employees",
      <Routes>
        <Route path="/employees" element={<DirectoryPage />} />
        <Route path="/employees/:id" element={<p>Profile page</p>} />
      </Routes>,
    );
  }

  beforeEach(() => {
    installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA, GRACE]) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
  });

  it("opens the profile when any part of the row is clicked", async () => {
    const user = userEvent.setup();
    renderWithProfileRoute();
    const table = await screen.findByRole("table", { name: "Employees" });

    await user.click(within(table).getByText("India"));

    expect(await screen.findByText("Profile page")).toBeInTheDocument();
  });

  it("opens the profile from the name link, for keyboard users", async () => {
    const user = userEvent.setup();
    renderWithProfileRoute();
    const table = await screen.findByRole("table", { name: "Employees" });

    within(table).getByRole("link", { name: "Grace Hopper" }).focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Profile page")).toBeInTheDocument();
  });

  it("opens a new tab on Ctrl-click instead of leaving the directory", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    renderWithProfileRoute();
    const table = await screen.findByRole("table", { name: "Employees" });

    await user.keyboard("{Control>}");
    await user.click(within(table).getByText("India"));
    await user.keyboard("{/Control}");

    expect(open).toHaveBeenCalledWith(`/employees/${GRACE.id}`, "_blank", "noopener");
    expect(screen.getByRole("table", { name: "Employees" })).toBeInTheDocument();
    open.mockRestore();
  });
});

describe("pay band badges", () => {
  it("asks only about the employees on the page, not the whole company", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      { method: "GET", path: "/api/employees", body: page([ADA, GRACE]) },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);

    renderAt("/employees", <DirectoryPage />);
    await screen.findByRole("table", { name: "Employees" });

    await waitFor(() => {
      const request = recorded.find((r) => r.url.startsWith("/api/analytics/band-violations"));
      expect(new URL(request?.url ?? "", "http://x").searchParams.get("employeeIds")).toBe(
        `${ADA.id},${GRACE.id}`,
      );
    });
  });
});
