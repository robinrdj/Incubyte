import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type FakeRoute, type RecordedRequest } from "../test-utils/fakeApi.js";
import { REFERENCE, renderAt, signedIn } from "../test-utils/render.js";
import { SettingsPage } from "./SettingsPage.js";

/** EUR has two dated rates; INR has none, so it must be flagged. */
const RATES = {
  reportingCurrency: "USD",
  items: [
    { currency: "EUR", rate: "1.08000000", rateDate: "2025-01-01" },
    { currency: "EUR", rate: "1.10000000", rateDate: "2024-01-01" },
  ],
};

const BANDS = {
  items: [
    {
      countryCode: "DE",
      levelCode: "L3",
      currency: "EUR",
      minAmount: "80000.00",
      maxAmount: "100000.00",
    },
    {
      countryCode: "IN",
      levelCode: "L1",
      currency: "INR",
      minAmount: "800000.00",
      maxAmount: "1200000.00",
    },
  ],
};

let recorded: RecordedRequest[];

function install(extra: FakeRoute[] = []): void {
  recorded = installFakeApi([
    ...extra,
    { method: "GET", path: "/api/reference", body: REFERENCE },
    { method: "GET", path: "/api/settings/fx-rates", body: RATES },
    { method: "GET", path: "/api/settings/pay-bands", body: BANDS },
    {
      method: "PUT",
      path: "/api/settings/fx-rates",
      body: { currency: "EUR", rate: "1.12000000", rateDate: "2026-01-01" },
    },
    {
      method: "PUT",
      path: "/api/settings/pay-bands/DE/L3",
      body: { ...BANDS.items[0], minAmount: "85000.00", maxAmount: "105000.00" },
    },
  ]);
}

const puts = (): RecordedRequest[] => recorded.filter((r) => r.method === "PUT");

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("exchange rates", () => {
  it("shows the latest rate for each currency and flags a currency with none", async () => {
    install();
    renderAt("/settings", <SettingsPage />);

    const table = await screen.findByRole("table", { name: "Latest exchange rates" });
    const eur = within(table).getByText("EUR").closest("tr");
    const inr = within(table).getByText("INR").closest("tr");
    expect(eur).toHaveTextContent("1.08");
    expect(eur).toHaveTextContent("1 Jan 2025");
    expect(inr).toHaveTextContent("No rate");
  });

  it("saves a new dated rate and confirms it", async () => {
    install();
    const user = userEvent.setup();
    renderAt("/settings", <SettingsPage />);
    await screen.findByRole("table", { name: "Latest exchange rates" });

    await user.click(screen.getByRole("button", { name: "Change the EUR rate" }));
    const rate = screen.getByRole("textbox", { name: /1 unit in usd/i });
    await user.clear(rate);
    await user.type(rate, "1.12");
    const date = screen.getByLabelText(/applies from/i);
    await user.clear(date);
    await user.type(date, "2026-01-01");
    await user.click(screen.getByRole("button", { name: "Save rate" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved: 1 EUR = 1.12 USD from 1 Jan 2026.",
    );
    expect(puts()[0]?.body).toEqual({ currency: "EUR", rate: "1.12", rateDate: "2026-01-01" });
  });

  it("shows the history of the chosen currency, newest first", async () => {
    install();
    const user = userEvent.setup();
    renderAt("/settings", <SettingsPage />);
    await screen.findByRole("table", { name: "Latest exchange rates" });

    await user.click(screen.getByRole("button", { name: "Change the EUR rate" }));

    const history = screen.getByRole("table", { name: "EUR rate history" });
    const rows = within(history).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(["1 Jan 20251.08", "1 Jan 20241.1"]);
    expect(screen.getByRole("textbox", { name: /1 unit in usd/i })).toHaveValue("1.08");
  });

  it("rejects a rate that is not a positive number without calling the API", async () => {
    install();
    const user = userEvent.setup();
    renderAt("/settings", <SettingsPage />);
    await screen.findByRole("table", { name: "Latest exchange rates" });

    await user.click(screen.getByRole("button", { name: "Change the INR rate" }));
    await user.type(screen.getByRole("textbox", { name: /1 unit in usd/i }), "0");
    await user.click(screen.getByRole("button", { name: "Save rate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("greater than zero");
    expect(puts()).toHaveLength(0);
  });

  it("shows the server's reason when a rate is refused", async () => {
    install([
      {
        method: "PUT",
        path: "/api/settings/fx-rates",
        status: 422,
        body: { error: { code: "UNPROCESSABLE", message: "No country pays salaries in INR." } },
      },
    ]);
    const user = userEvent.setup();
    renderAt("/settings", <SettingsPage />);
    await screen.findByRole("table", { name: "Latest exchange rates" });

    await user.click(screen.getByRole("button", { name: "Change the INR rate" }));
    await user.type(screen.getByRole("textbox", { name: /1 unit in usd/i }), "0.012");
    await user.click(screen.getByRole("button", { name: "Save rate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No country pays salaries in INR.");
  });
});

describe("pay bands", () => {
  async function openBands(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    renderAt("/settings", <SettingsPage />);
    await user.click(await screen.findByRole("tab", { name: "Pay bands" }));
    return screen.findByRole("table", { name: "Pay bands in Germany" });
  }

  function rowFor(table: HTMLElement, level: string): HTMLElement {
    const cell = within(table).getByText(level);
    const row = cell.closest("tr");
    if (row === null) throw new Error(`no row for ${level}`);
    return row;
  }

  it("shows each level's band, with Add for levels that have none", async () => {
    install();
    const user = userEvent.setup();
    const table = await openBands(user);

    const l3 = rowFor(table, "L3");
    expect(l3).toHaveTextContent("€80,000.00");
    expect(l3).toHaveTextContent("€100,000.00");
    expect(within(l3).getByRole("button", { name: "Edit L3 band" })).toBeEnabled();
    expect(within(table).getAllByText("Not set")).toHaveLength(2);
    expect(within(table).getByRole("button", { name: "Add L1 band" })).toBeInTheDocument();
    expect(within(table).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("opens the row for editing with the current values and Save ready", async () => {
    install();
    const user = userEvent.setup();
    const table = await openBands(user);

    await user.click(within(table).getByRole("button", { name: "Edit L3 band" }));

    expect(within(table).getByRole("textbox", { name: "L3 minimum" })).toHaveValue("80000.00");
    expect(within(table).getByRole("textbox", { name: "L3 maximum" })).toHaveValue("100000.00");
    expect(within(table).getByRole("button", { name: "Save L3 band" })).toBeEnabled();
  });

  it("saves a changed band and shows it", async () => {
    install();
    const user = userEvent.setup();
    const table = await openBands(user);
    await user.click(within(table).getByRole("button", { name: "Edit L3 band" }));

    const min = within(table).getByRole("textbox", { name: "L3 minimum" });
    const max = within(table).getByRole("textbox", { name: "L3 maximum" });
    await user.clear(min);
    await user.type(min, "85000");
    await user.clear(max);
    await user.type(max, "105000");
    await user.click(within(table).getByRole("button", { name: "Save L3 band" }));

    expect(await within(table).findByRole("status")).toHaveTextContent("Saved");
    expect(rowFor(table, "L3")).toHaveTextContent("€85,000.00");
    expect(puts()[0]?.url).toBe("/api/settings/pay-bands/DE/L3");
    expect(puts()[0]?.body).toEqual({ minAmount: "85000", maxAmount: "105000" });
  });

  it("closes without saving when nothing changed", async () => {
    install();
    const user = userEvent.setup();
    const table = await openBands(user);
    await user.click(within(table).getByRole("button", { name: "Edit L3 band" }));

    await user.click(within(table).getByRole("button", { name: "Save L3 band" }));

    expect(within(table).getByRole("button", { name: "Edit L3 band" })).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("discards edits on Cancel", async () => {
    install();
    const user = userEvent.setup();
    const table = await openBands(user);
    await user.click(within(table).getByRole("button", { name: "Edit L3 band" }));
    await user.clear(within(table).getByRole("textbox", { name: "L3 minimum" }));

    await user.click(within(table).getByRole("button", { name: "Cancel editing L3 band" }));

    expect(rowFor(table, "L3")).toHaveTextContent("€80,000.00");
    expect(puts()).toHaveLength(0);
  });

  it("refuses a maximum below the minimum without calling the API", async () => {
    install();
    const user = userEvent.setup();
    const table = await openBands(user);
    await user.click(within(table).getByRole("button", { name: "Edit L3 band" }));

    const max = within(table).getByRole("textbox", { name: "L3 maximum" });
    await user.clear(max);
    await user.type(max, "70000");
    await user.click(within(table).getByRole("button", { name: "Save L3 band" }));

    expect(
      await within(table).findByText("The maximum cannot be below the minimum."),
    ).toBeVisible();
    expect(puts()).toHaveLength(0);
  });

  it("shows another country's bands when the country changes", async () => {
    install();
    const user = userEvent.setup();
    await openBands(user);

    await user.click(screen.getByRole("combobox", { name: /^country/i }));
    await user.click(await screen.findByText("India"));

    const table = await screen.findByRole("table", { name: "Pay bands in India" });
    await waitFor(() => {
      expect(rowFor(table, "L1")).toHaveTextContent("₹800,000.00");
    });
  });
});

describe("loading", () => {
  it("shows a placeholder shaped like the rates tab while it loads", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    renderAt("/settings", <SettingsPage />);

    expect(screen.getByLabelText("Loading exchange rates")).toBeInTheDocument();
  });

  it("does not reload a tab when switching back to it", async () => {
    install();
    const user = userEvent.setup();
    renderAt("/settings", <SettingsPage />);
    await screen.findByRole("table", { name: "Latest exchange rates" });

    await user.click(screen.getByRole("tab", { name: "Pay bands" }));
    await screen.findByRole("table", { name: "Pay bands in Germany" });
    await user.click(screen.getByRole("tab", { name: "Exchange rates" }));

    expect(screen.getByRole("table", { name: "Latest exchange rates" })).toBeInTheDocument();
    expect(recorded.filter((r) => r.url === "/api/settings/fx-rates")).toHaveLength(1);
  });
});
