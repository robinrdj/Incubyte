import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type RecordedRequest } from "../test-utils/fakeApi.js";
import { bandReport, renderAt, signedIn } from "../test-utils/render.js";
import { AnalyticsPage } from "./AnalyticsPage.js";

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

let recorded: RecordedRequest[];

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
  recorded = installFakeApi([
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

    const median = (await screen.findByText("Median", { selector: "p" })).parentElement;
    expect(median).toHaveTextContent("$66,000.00");
    expect(screen.getByText("Average", { selector: "p" }).parentElement).toHaveTextContent(
      "$74,120.00",
    );
    expect(screen.getByText("5")).toBeInTheDocument();
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

  it("asks the API for the grouping that is chosen", async () => {
    const user = userEvent.setup();
    renderAt("/analytics", <AnalyticsPage />);
    await screen.findByRole("table", { name: "Compensation by country" });

    await user.click(screen.getByRole("combobox", { name: /group by/i }));
    await user.click(await screen.findByText("Department"));

    await waitFor(() => {
      expect(
        recorded.some(
          (r) => new URL(r.url, "http://x").searchParams.get("groupBy") === "department",
        ),
      ).toBe(true);
    });
  });

  it("lists employees outside their pay band, with a link to their profile", async () => {
    recorded = installFakeApi([
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
    recorded = installFakeApi([
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
