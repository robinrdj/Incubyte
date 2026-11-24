import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type RecordedRequest } from "../support/fake-api.js";
import { bandReport, renderAt, signedIn } from "../support/render.js";
import { Route, Routes } from "react-router";
import { AnalyticsPage, BAND_PAGE_SIZE } from "../../src/pages/AnalyticsPage.js";

const COMPENSATION = {
  asOf: "2026-11-23",
  currency: "USD",
  groupBy: "country",
  overall: {
    headcount: 5,
    medianUsd: "66000.00",
    averageUsd: "74120.00",
    minUsd: "21600.00",
    maxUsd: "143000.00",
  },
  excludedWithoutSalary: 1,
  groups: [
    {
      key: "DE",
      label: "Germany",
      summary: {
        headcount: 3,
        medianUsd: "110000.00",
        averageUsd: "106333.33",
        minUsd: "66000.00",
        maxUsd: "143000.00",
      },
    },
    {
      key: "IN",
      label: "India",
      summary: {
        headcount: 2,
        medianUsd: "25800.00",
        averageUsd: "25800.00",
        minUsd: "21600.00",
        maxUsd: "30000.00",
      },
    },
  ],
};

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
  installFakeApi([
    { method: "GET", path: "/api/analytics/compensation", body: COMPENSATION },
    { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
  ]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("analytics dashboard", () => {
  it("shows the overall figures in US dollars", async () => {
    renderAt("/analytics", <AnalyticsPage />);

    expect(await screen.findByRole("group", { name: "Median" })).toHaveTextContent("$66,000.00");
    expect(screen.getByRole("group", { name: "Average" })).toHaveTextContent("$74,120.00");
    expect(screen.getByRole("group", { name: "Headcount" })).toHaveTextContent("5");
  });

  it("shows one row per group with its figures", async () => {
    renderAt("/analytics", <AnalyticsPage />);

    const table = await screen.findByRole("table", { name: "Compensation by country" });
    const germany = within(table).getByText("Germany").closest("tr");
    expect(within(germany as HTMLElement).getByText("$110,000.00")).toBeInTheDocument();
    expect(within(germany as HTMLElement).getByText("3")).toBeInTheDocument();
    expect(within(table).getByText("India")).toBeInTheDocument();
  });

  it("explains how many active employees were left out", async () => {
    renderAt("/analytics", <AnalyticsPage />);

    expect(
      await screen.findByText(
        "1 active employee(s) had no salary on this date and are not counted.",
      ),
    ).toBeInTheDocument();
  });

  it("lists employees outside their pay band, with a link to their profile", async () => {
    installFakeApi([
      { method: "GET", path: "/api/analytics/compensation", body: COMPENSATION },
      {
        method: "GET",
        path: "/api/analytics/band-violations",
        body: bandReport([
          {
            employeeId: "22222222-2222-4222-8222-222222222222",
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

    renderAt("/analytics", <AnalyticsPage />);

    const table = await screen.findByRole("table", { name: "Employees outside their pay band" });
    expect(within(table).getByRole("link", { name: "Grace Hopper" })).toHaveAttribute(
      "href",
      "/employees/22222222-2222-4222-8222-222222222222",
    );
    expect(within(table).getByText("Above band")).toBeInTheDocument();
    expect(within(table).getByText("1.20")).toBeInTheDocument();
  });

  it("says so when everyone evaluated is within their band", async () => {
    renderAt("/analytics", <AnalyticsPage />);
    expect(await screen.findByText("Everyone evaluated is within their band.")).toBeInTheDocument();
  });

  it("explains a missing exchange rate rather than showing wrong figures", async () => {
    installFakeApi([
      {
        method: "GET",
        path: "/api/analytics/compensation",
        status: 422,
        body: {
          error: {
            code: "UNPROCESSABLE",
            message:
              "No FX rate on or before 2026-11-23 for GBP. Add the rates before running analytics.",
          },
        },
      },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);

    renderAt("/analytics", <AnalyticsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No FX rate on or before 2026-11-23 for GBP",
    );
    expect(screen.queryByText("$66,000.00")).not.toBeInTheDocument();
  });
});

/** A report for one grouping, labelled so the test can tell which grouping is on screen. */
function reportFor(groupBy: string) {
  return {
    ...COMPENSATION,
    groupBy,
    groups: [{ ...COMPENSATION.groups[0], key: groupBy, label: `${groupBy} group` }],
  };
}

/**
 * Answers the compensation endpoint per grouping. A grouping listed in `hold` never answers,
 * which keeps that request pending for as long as the test needs.
 */
function stubByGrouping(hold: string[] = []): string[] {
  const asked: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const parsed = new URL(url, "http://x");
      if (parsed.pathname === "/api/analytics/band-violations") {
        return Promise.resolve(Response.json(bandReport()));
      }
      const groupBy = parsed.searchParams.get("groupBy") ?? "country";
      asked.push(groupBy);
      if (hold.includes(groupBy)) return new Promise<Response>(() => undefined);
      return Promise.resolve(Response.json(reportFor(groupBy)));
    }),
  );
  return asked;
}

async function chooseGrouping(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: /group by/i }));
  // Mantine options have no option role in jsdom, so find the text inside the dropdown.
  const matches = await screen.findAllByText(label);
  const option = matches.find((element) => element.closest("[data-combobox-option]") !== null);
  if (option === undefined) throw new Error(`no "${label}" option`);
  await user.click(option);
}

describe("changing the grouping", () => {
  it("shows placeholders in the shape of the dashboard while the first figures load", () => {
    stubByGrouping(["country"]);
    renderAt("/analytics", <AnalyticsPage />);

    expect(screen.getByLabelText("Loading analytics")).toBeInTheDocument();
  });

  it("shows the chosen grouping", async () => {
    stubByGrouping();
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);
    await screen.findByRole("table", { name: "Compensation by country" });

    await chooseGrouping(user, "Department");

    const table = await screen.findByRole("table", { name: "Compensation by department" });
    expect(within(table).getByText("department group")).toBeInTheDocument();
  });

  it("fetches the other groupings in the background, so switching does not wait", async () => {
    const asked = stubByGrouping();
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);
    await screen.findByRole("table", { name: "Compensation by country" });
    await waitFor(() => {
      expect([...asked].sort()).toEqual(["country", "department", "level"]);
    });

    await chooseGrouping(user, "Level");
    await screen.findByRole("table", { name: "Compensation by level" });
    await chooseGrouping(user, "Country");
    await screen.findByRole("table", { name: "Compensation by country" });

    expect(asked).toHaveLength(3);
  });

  it("keeps the current figures on screen and says it is updating while a grouping loads", async () => {
    stubByGrouping(["department"]);
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);
    await screen.findByRole("table", { name: "Compensation by country" });

    await chooseGrouping(user, "Department");

    expect(await screen.findByText("Updating…")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Compensation by country" })).toBeInTheDocument();
  });
});

describe("employees outside their band", () => {
  function violation(n: number, compaRatio: number, position: "BELOW" | "ABOVE") {
    return {
      employeeId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      employeeCode: `EMP-${String(n).padStart(6, "0")}`,
      firstName: "Person",
      lastName: String(n),
      countryCode: "DE",
      departmentName: "Engineering",
      levelCode: "L3",
      salary: { amount: "1.00", currency: "EUR", usd: "1.00" },
      band: { minUsd: "1.00", maxUsd: "2.00" },
      position,
      compaRatio,
    };
  }

  function install(items: ReturnType<typeof violation>[]): void {
    installFakeApi([
      { method: "GET", path: "/api/analytics/compensation", body: COMPENSATION },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport(items) },
    ]);
  }

  const bandRequests = (recorded: RecordedRequest[]): URLSearchParams[] =>
    recorded
      .filter((r) => r.url.startsWith("/api/analytics/band-violations"))
      .map((r) => new URL(r.url, "http://x").searchParams);

  const names = (table: HTMLElement): string[] =>
    within(table)
      .getAllByRole("link")
      .map((link) => link.textContent);

  it("opens the employee's profile when their row is clicked", async () => {
    install([violation(7, 1.4, "ABOVE")]);
    const user = userEvent.setup();
    renderAt(
      "/analytics",
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/employees/:id" element={<p>Profile of employee 7</p>} />
      </Routes>,
    );
    const table = await screen.findByRole("table", { name: "Employees outside their pay band" });

    await user.click(within(table).getByText("1.40"));

    expect(await screen.findByText("Profile of employee 7")).toBeInTheDocument();
  });

  it("asks the server for one page of 25 and offers the other pages", async () => {
    // The server reports 60 people outside their band and sends the first 25.
    const firstPage = Array.from({ length: 25 }, (_, i) => violation(i + 1, 1.5, "ABOVE"));
    const recorded = installFakeApi([
      { method: "GET", path: "/api/analytics/compensation", body: COMPENSATION },
      {
        method: "GET",
        path: "/api/analytics/band-violations",
        body: { ...bandReport(firstPage), below: 20, above: 40, total: 60, pageSize: 25 },
      },
    ]);
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);

    const table = await screen.findByRole("table", { name: "Employees outside their pay band" });
    expect(names(table)).toHaveLength(BAND_PAGE_SIZE);
    expect(screen.getByText(/Showing 1–25 of 60/)).toBeInTheDocument();
    expect(screen.getByText("All 60")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(bandRequests(recorded).at(-1)?.get("page")).toBe("2");
    });
    expect(bandRequests(recorded).at(-1)?.get("pageSize")).toBe(String(BAND_PAGE_SIZE));
  });

  it("asks the server for people below their band, from the first page", async () => {
    const recorded = installFakeApi([
      { method: "GET", path: "/api/analytics/compensation", body: COMPENSATION },
      {
        method: "GET",
        path: "/api/analytics/band-violations",
        body: bandReport([violation(1, 0.7, "BELOW"), violation(2, 1.3, "ABOVE")]),
      },
    ]);
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);
    await screen.findByRole("table", { name: "Employees outside their pay band" });

    await user.click(screen.getByText("Below 1"));

    await waitFor(() => {
      expect(bandRequests(recorded).at(-1)?.get("position")).toBe("BELOW");
    });
    expect(bandRequests(recorded).at(-1)?.get("page")).toBe("1");
  });
});

describe("exporting analytics", () => {
  const createObjectURL = vi.fn(() => "blob:test");

  beforeEach(() => {
    createObjectURL.mockClear();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads the table for the grouping and date on screen", async () => {
    const recorded = installFakeApi([
      { method: "GET", path: "/api/analytics/compensation", body: COMPENSATION },
      { method: "GET", path: "/api/analytics/compensation.csv", body: "country,headcount" },
      { method: "GET", path: "/api/analytics/band-violations", body: bandReport() },
    ]);
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);
    const table = await screen.findByRole("table", { name: "Compensation by country" });
    const card = table.closest(".mantine-Card-root") as HTMLElement;

    await user.click(within(card).getByRole("button", { name: "Export CSV" }));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });
    const request = recorded.find((r) => r.url.startsWith("/api/analytics/compensation.csv"));
    const params = new URL(request?.url ?? "", "http://x").searchParams;
    expect(params.get("groupBy")).toBe("country");
    expect(params.get("asOf")).toBe("2026-11-23");
  });
});
