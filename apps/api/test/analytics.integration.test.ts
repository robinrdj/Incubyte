import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { SettingsService } from "../src/services/settings-service.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { AnalyticsService } from "../src/services/analytics-service.js";
import { BulkExchangeService } from "../src/services/bulk-exchange-service.js";
import { EmployeeService } from "../src/services/employee-service.js";
import {
  AUTH_HEADER,
  FIXED_NOW,
  TEST_CREDENTIALS,
  createTestClient,
  resetDatabase,
} from "./helpers.js";

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  prisma = createTestClient();
  app = createApp({
    service: new EmployeeService(prisma, () => FIXED_NOW),
    analytics: new AnalyticsService(prisma, () => FIXED_NOW),
    bulk: new BulkExchangeService(prisma, () => FIXED_NOW),
    settings: new SettingsService(prisma),
    credentials: TEST_CREDENTIALS,
  });
});

afterAll(() => prisma.$disconnect());

interface EmployeeSpec {
  code: string;
  firstName: string;
  lastName: string;
  country: string;
  department: string;
  level: string;
  salary: string;
  currency: string;
  status?: "ACTIVE" | "LEAVING";
  effectiveFrom?: string;
}

/** Inserts an employee directly, so the fixture is exact and independent of the API under test. */
async function addEmployee(spec: EmployeeSpec): Promise<void> {
  const country = await prisma.country.findUniqueOrThrow({ where: { code: spec.country } });
  const department = await prisma.department.findUniqueOrThrow({
    where: { name: spec.department },
  });
  const level = await prisma.level.findUniqueOrThrow({ where: { code: spec.level } });
  const employee = await prisma.employee.create({
    data: {
      employeeCode: spec.code,
      firstName: spec.firstName,
      lastName: spec.lastName,
      email: `${spec.code.toLowerCase()}@acme.test`,
      jobTitle: "Engineer",
      startDate: new Date("2024-01-01"),
      status: spec.status ?? "ACTIVE",
      countryId: country.id,
      departmentId: department.id,
      levelId: level.id,
    },
  });
  await prisma.salaryRecord.create({
    data: {
      employeeId: employee.id,
      amount: spec.salary,
      currency: spec.currency,
      effectiveFrom: new Date(spec.effectiveFrom ?? "2024-01-15"),
      createdBy: "fixture",
    },
  });
}

/**
 * Fixed fixture with hand-calculated expectations.
 * EUR rates: 1.00 (2025-01-01), 1.10 (2026-01-01). INR rate: 0.012 (2025-01-01).
 * Pay bands: L3 in Germany 80,000-120,000 EUR (88,000-132,000 USD).
 *            L3 in India 2,000,000-3,000,000 INR (24,000-36,000 USD).
 */
async function seedFixture(): Promise<void> {
  await prisma.fxRate.createMany({
    data: [
      {
        fromCurrency: "EUR",
        toCurrency: "USD",
        rate: "1.00000000",
        rateDate: new Date("2025-01-01"),
      },
      {
        fromCurrency: "EUR",
        toCurrency: "USD",
        rate: "1.10000000",
        rateDate: new Date("2026-01-01"),
      },
      {
        fromCurrency: "INR",
        toCurrency: "USD",
        rate: "0.01200000",
        rateDate: new Date("2025-01-01"),
      },
    ],
  });

  const level3 = await prisma.level.findUniqueOrThrow({ where: { code: "L3" } });
  const germany = await prisma.country.findUniqueOrThrow({ where: { code: "DE" } });
  const india = await prisma.country.findUniqueOrThrow({ where: { code: "IN" } });
  await prisma.payBand.createMany({
    data: [
      {
        levelId: level3.id,
        countryId: germany.id,
        currency: "EUR",
        minAmount: "80000.00",
        maxAmount: "120000.00",
      },
      {
        levelId: level3.id,
        countryId: india.id,
        currency: "INR",
        minAmount: "2000000.00",
        maxAmount: "3000000.00",
      },
    ],
  });

  await addEmployee({
    code: "EMP-000001",
    firstName: "Ada",
    lastName: "A",
    country: "DE",
    department: "Engineering",
    level: "L3",
    salary: "100000.00",
    currency: "EUR",
  });
  await addEmployee({
    code: "EMP-000002",
    firstName: "Ben",
    lastName: "B",
    country: "DE",
    department: "Engineering",
    level: "L3",
    salary: "130000.00",
    currency: "EUR",
  });
  await addEmployee({
    code: "EMP-000003",
    firstName: "Cara",
    lastName: "C",
    country: "DE",
    department: "Finance",
    level: "L1",
    salary: "60000.00",
    currency: "EUR",
  });
  await addEmployee({
    code: "EMP-000004",
    firstName: "Dev",
    lastName: "D",
    country: "IN",
    department: "Finance",
    level: "L3",
    salary: "2500000.00",
    currency: "INR",
  });
  await addEmployee({
    code: "EMP-000005",
    firstName: "Esha",
    lastName: "E",
    country: "IN",
    department: "Engineering",
    level: "L3",
    salary: "1800000.00",
    currency: "INR",
  });
  // Not active: excluded from every figure.
  await addEmployee({
    code: "EMP-000006",
    firstName: "Fay",
    lastName: "F",
    country: "DE",
    department: "Engineering",
    level: "L3",
    salary: "50000.00",
    currency: "EUR",
    status: "LEAVING",
  });
  // Active but whose only salary is dated after asOf: excluded and counted.
  await addEmployee({
    code: "EMP-000007",
    firstName: "Gus",
    lastName: "G",
    country: "DE",
    department: "Engineering",
    level: "L3",
    salary: "70000.00",
    currency: "EUR",
    effectiveFrom: "2027-01-01",
  });
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

async function getJson(path: string) {
  return request(app).get(path).set("Authorization", AUTH_HEADER);
}

describe("compensation analytics (fixed fixture)", () => {
  beforeEach(seedFixture);

  it("computes overall headcount and USD statistics for active employees", async () => {
    const response = await getJson("/api/analytics/compensation?asOf=2026-11-23");

    expect(response.status).toBe(200);
    expect(response.body.overall).toEqual({
      headcount: 5,
      medianUsd: "66000.00",
      averageUsd: "74120.00",
      minUsd: "21600.00",
      maxUsd: "143000.00",
    });
  });

  it("reports how many active employees were left out for lacking a salary on the date", async () => {
    const response = await getJson("/api/analytics/compensation?asOf=2026-11-23");
    expect(response.body.excludedWithoutSalary).toBe(1);
  });

  it("groups by country, sorted by name, with exact USD figures", async () => {
    const response = await getJson("/api/analytics/compensation?groupBy=country&asOf=2026-11-23");

    expect(response.body.groups).toEqual([
      {
        key: expect.any(String),
        label: "Germany",
        summary: {
          headcount: 3,
          medianUsd: "110000.00",
          averageUsd: "106333.33",
          minUsd: "66000.00",
          maxUsd: "143000.00",
        },
      },
      {
        key: expect.any(String),
        label: "India",
        summary: {
          headcount: 2,
          medianUsd: "25800.00",
          averageUsd: "25800.00",
          minUsd: "21600.00",
          maxUsd: "30000.00",
        },
      },
    ]);
  });

  it("groups by department", async () => {
    const response = await getJson(
      "/api/analytics/compensation?groupBy=department&asOf=2026-11-23",
    );

    const byLabel = Object.fromEntries(
      response.body.groups.map((g: { label: string; summary: unknown }) => [g.label, g.summary]),
    );
    expect(byLabel).toEqual({
      Engineering: {
        headcount: 3,
        medianUsd: "110000.00",
        averageUsd: "91533.33",
        minUsd: "21600.00",
        maxUsd: "143000.00",
      },
      Finance: {
        headcount: 2,
        medianUsd: "48000.00",
        averageUsd: "48000.00",
        minUsd: "30000.00",
        maxUsd: "66000.00",
      },
    });
  });

  it("groups by level", async () => {
    const response = await getJson("/api/analytics/compensation?groupBy=level&asOf=2026-11-23");

    const byLabel = Object.fromEntries(
      response.body.groups.map((g: { label: string; summary: unknown }) => [g.label, g.summary]),
    );
    expect(byLabel.L1).toEqual({
      headcount: 1,
      medianUsd: "66000.00",
      averageUsd: "66000.00",
      minUsd: "66000.00",
      maxUsd: "66000.00",
    });
    expect(byLabel.L3).toEqual({
      headcount: 4,
      medianUsd: "70000.00",
      averageUsd: "76150.00",
      minUsd: "21600.00",
      maxUsd: "143000.00",
    });
  });

  it("uses the latest FX rate on or before the requested date", async () => {
    // On 2025-06-01 the 2026 EUR rate does not apply yet, so EUR is at parity (1.00).
    const response = await getJson("/api/analytics/compensation?groupBy=country&asOf=2025-06-01");

    const germany = response.body.groups.find((g: { label: string }) => g.label === "Germany");
    expect(germany.summary).toEqual({
      headcount: 3,
      medianUsd: "100000.00",
      averageUsd: "96666.67",
      minUsd: "60000.00",
      maxUsd: "130000.00",
    });
  });

  it("defaults to a valid country grouping when no groupBy is given", async () => {
    const response = await getJson("/api/analytics/compensation");
    expect(response.body.groupBy).toBe("country");
  });

  it("rejects an unknown groupBy", async () => {
    const response = await getJson("/api/analytics/compensation?groupBy=manager");
    expect(response.status).toBe(400);
  });

  it("rejects an impossible asOf date", async () => {
    const response = await getJson("/api/analytics/compensation?asOf=2026-02-30");
    expect(response.status).toBe(400);
  });
});

describe("pay band violations (fixed fixture)", () => {
  beforeEach(seedFixture);

  it("lists employees outside their band, with USD bounds and compa-ratio", async () => {
    const response = await getJson("/api/analytics/band-violations?asOf=2026-11-23");

    expect(response.status).toBe(200);
    expect(response.body.evaluated).toBe(4);
    expect(response.body.withoutBand).toBe(1);
    expect(response.body.items).toEqual([
      {
        employeeId: expect.any(String),
        employeeCode: "EMP-000002",
        firstName: "Ben",
        lastName: "B",
        countryCode: "DE",
        departmentName: "Engineering",
        levelCode: "L3",
        salary: { amount: "130000.00", currency: "EUR", usd: "143000.00" },
        band: { minUsd: "88000.00", maxUsd: "132000.00" },
        position: "ABOVE",
        compaRatio: 1.3,
      },
      {
        employeeId: expect.any(String),
        employeeCode: "EMP-000005",
        firstName: "Esha",
        lastName: "E",
        countryCode: "IN",
        departmentName: "Engineering",
        levelCode: "L3",
        salary: { amount: "1800000.00", currency: "INR", usd: "21600.00" },
        band: { minUsd: "24000.00", maxUsd: "36000.00" },
        position: "BELOW",
        compaRatio: 0.72,
      },
    ]);
  });

  it("does not list employees within their band", async () => {
    const response = await getJson("/api/analytics/band-violations?asOf=2026-11-23");
    const codes = response.body.items.map((i: { employeeCode: string }) => i.employeeCode);
    expect(codes).not.toContain("EMP-000001");
    expect(codes).not.toContain("EMP-000004");
  });
});

describe("analytics error handling", () => {
  it("fails clearly, naming the currency, when an FX rate is missing", async () => {
    await seedFixture();
    await addEmployee({
      code: "EMP-000099",
      firstName: "Hal",
      lastName: "H",
      country: "DE",
      department: "Engineering",
      level: "L3",
      salary: "90000.00",
      currency: "GBP",
    });

    const response = await getJson("/api/analytics/compensation?asOf=2026-11-23");

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("GBP");
  });

  it("returns an empty report when there are no active employees", async () => {
    const response = await getJson("/api/analytics/compensation?asOf=2026-11-23");

    expect(response.status).toBe(200);
    expect(response.body.overall).toEqual({
      headcount: 0,
      medianUsd: null,
      averageUsd: null,
      minUsd: null,
      maxUsd: null,
    });
    expect(response.body.groups).toEqual([]);
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/analytics/compensation");
    expect(response.status).toBe(401);
  });
});
