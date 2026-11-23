import { mean, median } from "./statistics.js";
import type { MinorUnits } from "./money.js";

/** Summary statistics over a set of amounts in minor units. Null fields mean there were no employees. */
export interface CompensationSummary {
  readonly headcount: number;
  readonly medianMinor: MinorUnits | null;
  readonly averageMinor: MinorUnits | null;
  readonly minMinor: MinorUnits | null;
  readonly maxMinor: MinorUnits | null;
}

/**
 * Headcount, median, average, minimum, and maximum of salaries.
 * Median and average are rounded to the nearest minor unit so results are always whole cents.
 */
export function summarizeCompensation(amounts: readonly MinorUnits[]): CompensationSummary {
  if (amounts.length === 0) {
    return { headcount: 0, medianMinor: null, averageMinor: null, minMinor: null, maxMinor: null };
  }
  return {
    headcount: amounts.length,
    medianMinor: roundOrNull(median(amounts)),
    averageMinor: roundOrNull(mean(amounts)),
    minMinor: Math.min(...amounts),
    maxMinor: Math.max(...amounts),
  };
}

export interface Group<T> {
  readonly key: string;
  readonly label: string;
  readonly items: T[];
}

/**
 * Groups items by a key, keeping first-seen labels. Groups are returned sorted by label,
 * so report output is stable across runs.
 */
export function groupItems<T>(
  items: readonly T[],
  classify: (item: T) => { key: string; label: string },
): Group<T>[] {
  const groups = new Map<string, Group<T>>();
  for (const item of items) {
    const { key, label } = classify(item);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { key, label, items: [item] });
    }
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}
