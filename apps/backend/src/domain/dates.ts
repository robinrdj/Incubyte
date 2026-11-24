/** The furthest-ahead time zone (Kiribati, UTC+14). */
const LATEST_OFFSET_MS = 14 * 60 * 60 * 1000;

/** Today in the furthest-ahead zone, so a date already today anywhere is not "future". */
export function latestToday(now: Date): string {
  return new Date(now.getTime() + LATEST_OFFSET_MS).toISOString().slice(0, 10);
}
