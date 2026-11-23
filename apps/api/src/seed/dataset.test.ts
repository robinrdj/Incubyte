import { describe, expect, it } from "vitest";
import { DEFAULT_EMPLOYEE_COUNT, generateDataset, type SeedDataset } from "./dataset.js";
import { SeededRandom } from "./random.js";

/** Small size for the detailed checks; the full-size run is covered once below. */
const SMALL = { seed: 7, employeeCount: 500 };

function salaryInBand(dataset: SeedDataset, employeeIndex: number): boolean | null {
  const employee = dataset.employees[employeeIndex];
  const current = employee?.salaries.at(-1);
  const band = dataset.payBands.find(
    (b) => b.levelCode === employee?.levelCode && b.countryCode === employee.countryCode,
  );
  if (!current || !band) return null;
  const amount = Number(current.amount);
  return amount >= Number(band.minAmount) && amount <= Number(band.maxAmount);
}

describe("SeededRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const a = new SeededRandom(99);
    const b = new SeededRandom(99);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(
      Array.from({ length: 20 }, () => b.next()),
    );
  });

  it("produces different sequences for different seeds", () => {
    expect(new SeededRandom(1).next()).not.toBe(new SeededRandom(2).next());
  });

  it("returns values in [0, 1)", () => {
    const rng = new SeededRandom(3);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("generates version-4 UUIDs", () => {
    const id = new SeededRandom(5).uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("generateDataset: reproducibility", () => {
  it("returns an identical dataset for the same seed", () => {
    expect(generateDataset(SMALL)).toEqual(generateDataset(SMALL));
  });

  it("returns a different dataset for a different seed", () => {
    const a = generateDataset({ seed: 1, employeeCount: 50 });
    const b = generateDataset({ seed: 2, employeeCount: 50 });
    expect(a.employees[0]?.email).not.toBe(b.employees[0]?.email);
  });
});

describe("generateDataset: shape and counts", () => {
  const dataset = generateDataset(SMALL);

  it("produces the reference data", () => {
    expect(dataset.countries).toHaveLength(10);
    expect(dataset.departments).toHaveLength(6);
    expect(dataset.levels).toHaveLength(6);
    expect(dataset.levels.map((l) => l.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("gives every level and country a pay band", () => {
    expect(dataset.payBands).toHaveLength(dataset.levels.length * dataset.countries.length);
  });

  it("produces the requested number of employees", () => {
    expect(dataset.employees).toHaveLength(500);
  });

  it("gives every employee a unique code, unique email, and a UUID", () => {
    const codes = new Set(dataset.employees.map((e) => e.employeeCode));
    const emails = new Set(dataset.employees.map((e) => e.email));
    const ids = new Set(dataset.employees.map((e) => e.id));
    expect(codes.size).toBe(500);
    expect(emails.size).toBe(500);
    expect(ids.size).toBe(500);
  });

  it("uses lower-case emails", () => {
    for (const employee of dataset.employees) {
      expect(employee.email).toBe(employee.email.toLowerCase());
    }
  });

  it("references only countries, departments, and levels that exist", () => {
    const countries = new Set(dataset.countries.map((c) => c.code));
    const departments = new Set(dataset.departments.map((d) => d.name));
    const levels = new Set(dataset.levels.map((l) => l.code));
    for (const employee of dataset.employees) {
      expect(countries.has(employee.countryCode)).toBe(true);
      expect(departments.has(employee.departmentName)).toBe(true);
      expect(levels.has(employee.levelCode)).toBe(true);
    }
  });

  it("gives every employee a band in their own country and level", () => {
    dataset.employees.forEach((_, index) => {
      expect(salaryInBand(dataset, index)).not.toBeNull();
    });
  });
});

describe("generateDataset: salary history", () => {
  const dataset = generateDataset(SMALL);

  it("starts each salary history on the employee's start date", () => {
    for (const employee of dataset.employees) {
      expect(employee.salaries[0]?.effectiveFrom).toBe(employee.startDate);
    }
  });

  it("orders later salary records strictly after earlier ones", () => {
    for (const employee of dataset.employees) {
      const dates = employee.salaries.map((s) => s.effectiveFrom);
      expect([...dates].sort()).toEqual(dates);
      expect(new Set(dates).size).toBe(dates.length);
    }
  });

  it("writes every amount as whole units with two decimal places", () => {
    for (const employee of dataset.employees) {
      for (const salary of employee.salaries) {
        expect(salary.amount).toMatch(/^\d+\.00$/);
      }
    }
  });

  it("keeps each salary in the currency of the employee's country", () => {
    const currencyOf = new Map(dataset.countries.map((c) => [c.code, c.currency]));
    for (const employee of dataset.employees) {
      for (const salary of employee.salaries) {
        expect(salary.currency).toBe(currencyOf.get(employee.countryCode));
      }
    }
  });

  it("gives some employees raises", () => {
    expect(dataset.employees.some((e) => e.salaries.length > 1)).toBe(true);
  });

  it("never dates a salary after the anchor date", () => {
    for (const employee of dataset.employees) {
      for (const salary of employee.salaries) {
        expect(salary.effectiveFrom <= "2026-11-23").toBe(true);
      }
    }
  });
});

describe("generateDataset: pay realism", () => {
  it("places some employees outside their band, so analytics have violations to report", () => {
    const dataset = generateDataset(SMALL);
    const outside = dataset.employees.filter((_, i) => salaryInBand(dataset, i) === false);
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.length).toBeLessThan(dataset.employees.length);
  });

  it("gives higher levels a higher median salary in the same country", () => {
    const dataset = generateDataset({ seed: 7, employeeCount: 3000 });
    const median = (values: number[]): number => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };
    const us = dataset.employees.filter((e) => e.countryCode === "US");
    const medians = dataset.levels.map((level) =>
      median(
        us.filter((e) => e.levelCode === level.code).map((e) => Number(e.salaries[0]?.amount ?? 0)),
      ),
    );
    for (let i = 1; i < medians.length; i += 1) {
      expect(medians[i]).toBeGreaterThan(medians[i - 1] ?? 0);
    }
  });

  it("rejects a negative or fractional employee count", () => {
    expect(() => generateDataset({ employeeCount: -1 })).toThrow(RangeError);
    expect(() => generateDataset({ employeeCount: 1.5 })).toThrow(RangeError);
  });

  it("generates the full 10,000-employee dataset with the right counts", () => {
    const started = performance.now();
    const full = generateDataset();
    const elapsed = performance.now() - started;

    expect(full.employees).toHaveLength(DEFAULT_EMPLOYEE_COUNT);
    expect(new Set(full.employees.map((e) => e.employeeCode)).size).toBe(DEFAULT_EMPLOYEE_COUNT);
    expect(elapsed).toBeLessThan(5000);
  });
});
