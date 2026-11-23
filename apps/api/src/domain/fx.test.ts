import { describe, expect, it } from "vitest";
import { InvalidFxRateError, MissingFxRateError } from "./errors.js";
import { toReportingCurrency, type FxRates } from "./fx.js";

const rates: FxRates = new Map([
  ["EUR", 1.1],
  ["INR", 0.012],
]);

describe("toReportingCurrency", () => {
  it("returns the amount unchanged when already in USD", () => {
    expect(toReportingCurrency(5000000, "USD", rates)).toBe(5000000);
  });

  it("converts using the configured rate and rounds to the nearest minor unit", () => {
    // 100.00 EUR at 1.1 = 110.00 USD = 11000 cents
    expect(toReportingCurrency(10000, "EUR", rates)).toBe(11000);
    // 1 cent at 0.012 rounds to 0
    expect(toReportingCurrency(1, "INR", rates)).toBe(0);
  });

  it("throws MissingFxRateError when no rate is configured", () => {
    expect(() => toReportingCurrency(10000, "GBP", rates)).toThrow(MissingFxRateError);
  });

  it("names the missing currency in the error", () => {
    expect(() => toReportingCurrency(10000, "GBP", rates)).toThrow(/GBP/);
  });

  it.each([0, -1.2, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws InvalidFxRateError for rate %s",
    (rate) => {
      const bad: FxRates = new Map([["EUR", rate]]);
      expect(() => toReportingCurrency(10000, "EUR", bad)).toThrow(InvalidFxRateError);
    },
  );
});
