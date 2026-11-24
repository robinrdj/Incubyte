import { fail, ok, type Result } from "./result.js";

/** Money is integer cents inside the domain, which avoids floating-point drift. */
export type MinorUnits = number;

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Rejects negatives, zero, more than two decimals, and unsafe sizes. */
export function parseMoney(input: string): Result<MinorUnits> {
  const trimmed = input.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return fail(`"${input}" is not a valid amount with up to two decimal places`);
  }
  const [whole = "0", fraction = ""] = trimmed.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) {
    return fail(`"${input}" is too large`);
  }
  if (minor <= 0) {
    return fail(`amount must be greater than zero`);
  }
  return ok(minor);
}

/** Formats minor units as a two-decimal string, e.g. 12345678 becomes "123456.78". */
export function formatMoney(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const absolute = Math.abs(minor);
  const whole = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${String(whole)}.${fraction}`;
}
