import { describe, expect, it } from "vitest";
import { mean, median, percentile } from "../../../src/domain/statistics.js";

describe("mean", () => {
  it("averages the values", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns null for an empty input", () => {
    expect(mean([])).toBeNull();
  });
});

describe("median", () => {
  it("returns the middle value for an odd count", () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it("interpolates between the two middle values for an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns the single value for a one-item input", () => {
    expect(median([42])).toBe(42);
  });

  it("returns null for an empty input", () => {
    expect(median([])).toBeNull();
  });

  it("does not mutate the input array", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe("percentile (matches PostgreSQL percentile_cont)", () => {
  // percentile_cont(0.25) over {10,20,30,40} = 17.5; percentile_cont(0.75) = 32.5
  const values = [10, 20, 30, 40];

  it("interpolates the 25th percentile", () => {
    expect(percentile(values, 0.25)).toBe(17.5);
  });

  it("interpolates the 75th percentile", () => {
    expect(percentile(values, 0.75)).toBe(32.5);
  });

  it("returns the min at fraction 0 and the max at fraction 1", () => {
    expect(percentile(values, 0)).toBe(10);
    expect(percentile(values, 1)).toBe(40);
  });

  it("rejects fractions outside [0, 1]", () => {
    expect(() => percentile(values, 1.5)).toThrow(RangeError);
    expect(() => percentile(values, -0.1)).toThrow(RangeError);
  });
});
