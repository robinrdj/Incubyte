/** The furthest-ahead time zone (Kiribati, UTC+14). */
const LATEST_OFFSET_MS = 14 * 60 * 60 * 1000;

/**
 * Today's date in the time zone that reaches it first. Checking "not in the future" against this
 * accepts any date that is already today for someone, so an HR user in India is not told at
 * 01:00 local time that today is in the future just because it is still yesterday in UTC.
 */
export function latestToday(now: Date): string {
  return new Date(now.getTime() + LATEST_OFFSET_MS).toISOString().slice(0, 10);
}
