/** Arithmetic mean, or null for an empty input. */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

/** Linear interpolation, matching PostgreSQL's percentile_cont. Null for an empty input. */
export function percentile(values: readonly number[], fraction: number): number | null {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new RangeError(`percentile fraction must be between 0 and 1, got ${String(fraction)}`);
  }
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = fraction * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  if (lower === undefined || upper === undefined) {
    throw new Error("percentile index out of range");
  }
  return lower + (upper - lower) * (rank - lowerIndex);
}

export function median(values: readonly number[]): number | null {
  return percentile(values, 0.5);
}
