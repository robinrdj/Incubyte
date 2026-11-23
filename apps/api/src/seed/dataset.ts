import { SeededRandom } from "./random.js";

/**
 * Deterministic seed data for the salary tool. Pure: no database, no clock, no environment.
 * The same seed and size always produce the same dataset.
 *
 * Sample figures are illustrative, not market data. They exist so the analytics have realistic
 * shape to report on: pay rises with level, varies by country cost factor, and a share of people
 * sit outside their band.
 */

export const DEFAULT_SEED = 20261123;
export const DEFAULT_EMPLOYEE_COUNT = 10_000;

/** Date the seed is anchored to. Start dates and salary dates never fall after it. */
const ANCHOR_DATE = "2026-11-23";
const EARLIEST_START = "2015-01-01";
const LATEST_START = "2026-10-31";

interface CountrySpec {
  code: string;
  name: string;
  currency: string;
  /** Multiplier on the level's base pay, reflecting local cost of labour. */
  costFactor: number;
  weight: number;
}

const COUNTRIES: readonly CountrySpec[] = [
  { code: "US", name: "United States", currency: "USD", costFactor: 1.0, weight: 25 },
  { code: "IN", name: "India", currency: "INR", costFactor: 0.2, weight: 15 },
  { code: "GB", name: "United Kingdom", currency: "GBP", costFactor: 0.9, weight: 10 },
  { code: "DE", name: "Germany", currency: "EUR", costFactor: 0.85, weight: 10 },
  { code: "FR", name: "France", currency: "EUR", costFactor: 0.8, weight: 8 },
  { code: "NL", name: "Netherlands", currency: "EUR", costFactor: 0.85, weight: 5 },
  { code: "CA", name: "Canada", currency: "CAD", costFactor: 0.75, weight: 7 },
  { code: "AU", name: "Australia", currency: "AUD", costFactor: 0.8, weight: 6 },
  { code: "SG", name: "Singapore", currency: "SGD", costFactor: 0.8, weight: 6 },
  { code: "BR", name: "Brazil", currency: "BRL", costFactor: 0.35, weight: 8 },
];

/** Sample rates: 1 unit of currency in USD, on two dates so the "latest rate on or before" rule is exercised. */
const FX_RATES: readonly { date: string; rates: Record<string, string> }[] = [
  {
    date: "2025-01-01",
    rates: {
      EUR: "1.04000000",
      GBP: "1.25000000",
      CAD: "0.71000000",
      INR: "0.01170000",
      AUD: "0.65000000",
      SGD: "0.73000000",
      BRL: "0.18000000",
    },
  },
  {
    date: "2026-01-01",
    rates: {
      EUR: "1.08000000",
      GBP: "1.27000000",
      CAD: "0.73000000",
      INR: "0.01200000",
      AUD: "0.66000000",
      SGD: "0.74000000",
      BRL: "0.19000000",
    },
  },
];

const DEPARTMENTS: readonly { name: string; role: string; weight: number }[] = [
  { name: "Engineering", role: "Engineer", weight: 30 },
  { name: "Sales", role: "Account Executive", weight: 20 },
  { name: "Operations", role: "Operations Analyst", weight: 15 },
  { name: "Finance", role: "Accountant", weight: 10 },
  { name: "People", role: "HR Partner", weight: 8 },
  { name: "Marketing", role: "Marketing Specialist", weight: 17 },
];

const LEVELS: readonly { code: string; title: string; baseUsd: number; weight: number }[] = [
  { code: "L1", title: "Associate", baseUsd: 45_000, weight: 15 },
  { code: "L2", title: "Specialist", baseUsd: 60_000, weight: 25 },
  { code: "L3", title: "Senior Specialist", baseUsd: 80_000, weight: 25 },
  { code: "L4", title: "Lead", baseUsd: 105_000, weight: 18 },
  { code: "L5", title: "Manager", baseUsd: 135_000, weight: 10 },
  { code: "L6", title: "Director", baseUsd: 170_000, weight: 7 },
];

const FIRST_NAMES = [
  "Ada",
  "Alan",
  "Grace",
  "Linus",
  "Margaret",
  "Donald",
  "Barbara",
  "Edsger",
  "Frances",
  "Ken",
  "Dennis",
  "Radia",
  "Tim",
  "Hedy",
  "John",
  "Katherine",
  "Claude",
  "Annie",
  "Brian",
  "Joan",
  "Maria",
  "Ravi",
  "Priya",
  "Ahmed",
  "Lena",
  "Mateo",
  "Sofia",
  "Kenji",
  "Amara",
  "Diego",
];

const LAST_NAMES = [
  "Lovelace",
  "Turing",
  "Hopper",
  "Torvalds",
  "Hamilton",
  "Knuth",
  "Liskov",
  "Dijkstra",
  "Allen",
  "Thompson",
  "Ritchie",
  "Perlman",
  "Berners-Lee",
  "Lamarr",
  "McCarthy",
  "Johnson",
  "Shannon",
  "Easley",
  "Kernighan",
  "Clarke",
  "Garcia",
  "Patel",
  "Sharma",
  "Khan",
  "Müller",
  "Rossi",
  "Silva",
  "Tanaka",
  "Okafor",
  "Novak",
];

export interface CountryRow {
  code: string;
  name: string;
  currency: string;
}

export interface DepartmentRow {
  name: string;
}

export interface LevelRow {
  code: string;
  rank: number;
}

export interface FxRateRow {
  fromCurrency: string;
  rate: string;
  rateDate: string;
}

export interface PayBandRow {
  levelCode: string;
  countryCode: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
}

export interface SalaryRow {
  effectiveFrom: string;
  /** Decimal string with two places, in the salary's own currency. */
  amount: string;
  currency: string;
}

export interface EmployeeRow {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  /** Lower case, unique. */
  email: string;
  jobTitle: string;
  countryCode: string;
  departmentName: string;
  levelCode: string;
  startDate: string;
  status: "ACTIVE" | "LEAVING";
  /** Oldest first. The first record is dated on the start date. */
  salaries: SalaryRow[];
}

export interface SeedDataset {
  seed: number;
  countries: CountryRow[];
  departments: DepartmentRow[];
  levels: LevelRow[];
  fxRates: FxRateRow[];
  payBands: PayBandRow[];
  employees: EmployeeRow[];
}

export interface DatasetOptions {
  seed?: number;
  employeeCount?: number;
}

/** Days between two YYYY-MM-DD dates (b minus a). */
const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Converts a USD amount into whole local currency units, rounded to the nearest 100. */
function toLocal(usd: number, usdRate: number): number {
  return Math.round(usd / usdRate / 100) * 100;
}

/** Decimal string for a whole number of major units, e.g. 90000 becomes "90000.00". */
const money = (units: number): string => `${String(units)}.00`;

/**
 * The sample rate in force on a date: the latest rate dated on or before it. Dates before the first
 * sample rate use that first rate, so historic start dates still get a salary in USD terms.
 */
function fxRateFor(currency: string, date: string): number {
  if (currency === "USD") {
    return 1;
  }
  const entries = [...FX_RATES].reverse();
  const entry = entries.find((e) => e.date <= date) ?? FX_RATES[0];
  const rate = entry?.rates[currency];
  if (rate === undefined) {
    throw new Error(`no sample FX rate for ${currency}`);
  }
  return Number(rate);
}

/** Generates a complete, reproducible dataset. */
export function generateDataset(options: DatasetOptions = {}): SeedDataset {
  const seed = options.seed ?? DEFAULT_SEED;
  const employeeCount = options.employeeCount ?? DEFAULT_EMPLOYEE_COUNT;
  if (!Number.isInteger(employeeCount) || employeeCount < 0) {
    throw new RangeError(
      `employeeCount must be a non-negative integer, got ${String(employeeCount)}`,
    );
  }

  const rng = new SeededRandom(seed);
  const latestRaiseDate = ANCHOR_DATE;

  const fxRates: FxRateRow[] = FX_RATES.flatMap((entry) =>
    Object.entries(entry.rates).map(([currency, rate]) => ({
      fromCurrency: currency,
      rate,
      rateDate: entry.date,
    })),
  );

  // Pay bands: 90% to 110% of the level's expected pay in each country, in local currency.
  const payBands: PayBandRow[] = [];
  for (const level of LEVELS) {
    for (const country of COUNTRIES) {
      const rate = fxRateFor(country.currency, ANCHOR_DATE);
      const expectedUsd = level.baseUsd * country.costFactor;
      payBands.push({
        levelCode: level.code,
        countryCode: country.code,
        currency: country.currency,
        minAmount: money(toLocal(expectedUsd * 0.9, rate)),
        maxAmount: money(toLocal(expectedUsd * 1.1, rate)),
      });
    }
  }

  const employees: EmployeeRow[] = [];
  for (let n = 1; n <= employeeCount; n += 1) {
    const country = rng.weighted(COUNTRIES.map((c) => ({ value: c, weight: c.weight })));
    const department = rng.weighted(DEPARTMENTS.map((d) => ({ value: d, weight: d.weight })));
    const level = rng.weighted(LEVELS.map((l) => ({ value: l, weight: l.weight })));
    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);

    const startDate = addDays(
      EARLIEST_START,
      rng.int(0, daysBetween(EARLIEST_START, LATEST_START)),
    );
    const status: EmployeeRow["status"] = rng.next() < 0.05 ? "LEAVING" : "ACTIVE";

    // Pay varies by up to 12% either side of the level's expected pay in that country.
    const spread = 1 + (rng.next() * 0.24 - 0.12);
    const rate = fxRateFor(country.currency, startDate);
    const startingSalary = toLocal(level.baseUsd * country.costFactor * spread, rate);
    const salaries: SalaryRow[] = [
      { effectiveFrom: startDate, amount: money(startingSalary), currency: country.currency },
    ];

    // Roughly 30% of employees get one raise, dated after the start date and before the anchor.
    const raiseWindow = daysBetween(addDays(startDate, 365), latestRaiseDate);
    if (rng.next() < 0.3 && raiseWindow >= 0) {
      const raiseDate = addDays(startDate, 365 + rng.int(0, raiseWindow));
      const raisePercent = rng.int(3, 8);
      const raisedSalary = Math.round((startingSalary * (100 + raisePercent)) / 100 / 100) * 100;
      salaries.push({
        effectiveFrom: raiseDate,
        amount: money(raisedSalary),
        currency: country.currency,
      });
    }

    employees.push({
      id: rng.uuid(),
      employeeCode: `EMP-${String(n).padStart(6, "0")}`,
      firstName,
      lastName,
      email: `${normalizeForEmail(firstName)}.${normalizeForEmail(lastName)}${String(n)}@acme.test`,
      jobTitle: `${level.title} ${department.role}`,
      countryCode: country.code,
      departmentName: department.name,
      levelCode: level.code,
      startDate,
      status,
      salaries,
    });
  }

  return {
    seed,
    countries: COUNTRIES.map((c) => ({ code: c.code, name: c.name, currency: c.currency })),
    departments: DEPARTMENTS.map((d) => ({ name: d.name })),
    levels: LEVELS.map((l, index) => ({ code: l.code, rank: index + 1 })),
    fxRates,
    payBands,
    employees,
  };
}

/** Lower-cases a name and strips accents and punctuation, so it is safe in an email address. */
function normalizeForEmail(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}
