import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateDataset } from "../src/seed/dataset.js";
import { loadDataset } from "../src/seed/load.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { createTestClient, resetDatabase } from "./helpers.js";

/** Stated budget for loading the full 10,000-employee seed into an empty database. */
const SEED_TIME_BUDGET_MS = 60_000;

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createTestClient();
});

afterAll(() => prisma.$disconnect());

describe("seed loader", () => {
  it("loads the full 10,000-employee dataset within the time budget", async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "AuditLog", "SalaryRecord", "PayBand", "FxRate", "Employee", "Country", "Department", "Level" RESTART IDENTITY CASCADE',
    );

    const report = await loadDataset(prisma, generateDataset(), { reset: false });

    expect(report).toMatchObject({
      countries: 10,
      departments: 6,
      levels: 6,
      fxRates: 14,
      payBands: 60,
      employees: 10_000,
    });
    expect(report.elapsedMs).toBeLessThan(SEED_TIME_BUDGET_MS);

    expect(await prisma.employee.count()).toBe(10_000);
    expect(await prisma.salaryRecord.count()).toBe(report.salaryRecords);
    expect(await prisma.auditLog.count()).toBe(report.auditEvents);
  }, 120_000);

  it("refuses to load into a database that already holds data", async () => {
    await expect(
      loadDataset(prisma, generateDataset({ employeeCount: 5 }), { reset: false }),
    ).rejects.toThrow(/already contains data/);
  });

  it("stores identical rows for the same seed", async () => {
    const snapshot = async (): Promise<string> => {
      const employees = await prisma.employee.findMany({
        orderBy: { employeeCode: "asc" },
        include: { salaryRecords: { orderBy: { effectiveFrom: "asc" } } },
      });
      return JSON.stringify(
        employees.map((e) => [
          e.employeeCode,
          e.email,
          e.status,
          e.salaryRecords.map((s) => [
            s.amount.toFixed(2),
            s.currency,
            s.effectiveFrom.toISOString(),
          ]),
        ]),
      );
    };

    await resetDatabase(prisma);
    await loadDataset(prisma, generateDataset({ seed: 3, employeeCount: 300 }), { reset: true });
    const first = await snapshot();

    await loadDataset(prisma, generateDataset({ seed: 3, employeeCount: 300 }), { reset: true });
    const second = await snapshot();

    expect(second).toBe(first);
  });
});
