/**
 * Formats a decimal amount string such as "90000.00" with its currency, using the viewer's locale
 * for separators. The string is parsed only for display; it is never used for arithmetic, so no
 * rounding happens to stored values.
 */
export function formatMoney(amount: string, currency: string, locale = "en-US"): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return `${amount} ${currency}`;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats a YYYY-MM-DD date as a short, unambiguous label, e.g. "15 Jan 2025". */
export function formatDate(isoDate: string, locale = "en-GB"): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function bandLabel(position: "BELOW" | "ABOVE"): string {
  return position === "ABOVE" ? "Above band" : "Below band";
}
