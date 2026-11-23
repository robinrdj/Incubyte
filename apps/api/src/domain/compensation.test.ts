import { describe, expect, it } from "vitest";
import { groupItems, summarizeCompensation } from "./compensation.js";

describe("summarizeCompensation", () => {
  it("returns zero headcount and null statistics for no employees", () => {
    expect(summarizeCompensation([])).toEqual({
      headcount: 0,
      medianMinor: null,
      averageMinor: null,
      minMinor: null,
      maxMinor: null,
    });
  });

  it("reports the single value for one employee", () => {
    expect(summarizeCompensation([5000000])).toEqual({
      headcount: 1,
      medianMinor: 5000000,
      averageMinor: 5000000,
      minMinor: 5000000,
      maxMinor: 5000000,
    });
  });

  it("uses the middle value as median for an odd count", () => {
    const summary = summarizeCompensation([300, 100, 200]);
    expect(summary.medianMinor).toBe(200);
    expect(summary.minMinor).toBe(100);
    expect(summary.maxMinor).toBe(300);
  });

  it("averages the two middle values as median for an even count", () => {
    expect(summarizeCompensation([100, 200, 300, 400]).medianMinor).toBe(250);
  });

  it("rounds the average to a whole minor unit", () => {
    // 100 + 100 + 101 = 301, divided by 3 = 100.33..., rounds to 100
    expect(summarizeCompensation([100, 100, 101]).averageMinor).toBe(100);
    // 100 + 101 + 101 = 302, divided by 3 = 100.67..., rounds to 101
    expect(summarizeCompensation([100, 101, 101]).averageMinor).toBe(101);
  });
});

describe("groupItems", () => {
  const people = [
    { name: "Ada", country: "Germany" },
    { name: "Grace", country: "India" },
    { name: "Alan", country: "Germany" },
  ];

  it("groups items by key with their labels", () => {
    const groups = groupItems(people, (p) => ({ key: p.country, label: p.country }));
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Germany", 2],
      ["India", 1],
    ]);
  });

  it("returns groups sorted by label regardless of input order", () => {
    const reversed = [...people].reverse();
    const labels = groupItems(reversed, (p) => ({ key: p.country, label: p.country })).map(
      (g) => g.label,
    );
    expect(labels).toEqual(["Germany", "India"]);
  });

  it("returns no groups for no items", () => {
    expect(groupItems([], () => ({ key: "x", label: "x" }))).toEqual([]);
  });
});
