import { InvalidFxRateError, MissingFxRateError } from "./errors.js";
import type { MinorUnits } from "./money.js";

/** 1 unit of the currency = rate units of the reporting currency. */
export type FxRates = ReadonlyMap<string, number>;

export const REPORTING_CURRENCY = "USD";

/** Throws on a missing rate rather than producing a wrong total. */
export function toReportingCurrency(
  amount: MinorUnits,
  currency: string,
  rates: FxRates,
  reportingCurrency: string = REPORTING_CURRENCY,
): MinorUnits {
  if (currency === reportingCurrency) {
    return amount;
  }
  const rate = rates.get(currency);
  if (rate === undefined) {
    throw new MissingFxRateError(currency);
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new InvalidFxRateError(currency, rate);
  }
  return Math.round(amount * rate);
}
