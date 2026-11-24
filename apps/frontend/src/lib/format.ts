/** Display only: the amount string is never used for arithmetic. */
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

export const formatUsd = (value: string | null): string =>
  value === null ? "—" : formatMoney(value, "USD");
