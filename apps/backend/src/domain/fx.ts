import { InvalidFxRateError, MissingFxRateError } from "./errors.js";
import type { MinorUnits } from "./money.js";

/** Maps a currency code to its rate in the reporting currency: 1 unit of currency = rate reporting units. */
export type FxRates = ReadonlyMap<string, number>;

export const REPORTING_CURRENCY = "USD";

/**
 * Converts an amount into the reporting currency (USD by default).
 * Throws MissingFxRateError when no rate is configured for the currency, so a gap in the rate table
 * never produces a silently wrong total.
 */
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
