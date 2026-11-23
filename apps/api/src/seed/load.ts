import type { PrismaClient } from "../generated/prisma/client.js";
import type { SeedDataset } from "./dataset.js";

const BATCH_SIZE = 1000;

export interface LoadReport {
  countries: number;
  departments: number;
  levels: number;
  fxRates: number;
  payBands: number;
  employees: number;
  salaryRecords: number;
  auditEvents: number;
  elapsedMs: number;
}

const TABLES_TO_CLEAR = [
  "AuditLog",
  "SalaryRecord",
  "PayBand",
  "FxRate",
  "Employee",
  "Country",
  "Department",
  "Level",
];

function batches<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/**
 * Writes a dataset to the database in batches. Refuses to load into a database that already holds
 * countries unless `reset` is set, because reset deletes every domain table first.
 */
export async function loadDataset(
  db: PrismaClient,
  dataset: SeedDataset,
  options: { reset: boolean },
): Promise<LoadReport> {
  const started = performance.now();

  if (options.reset) {
    await db.$executeRawUnsafe(
      `TRUNCATE ${TABLES_TO_CLEAR.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
  } else if ((await db.country.count()) > 0) {
    throw new Error("the database already contains data; run the seed with --reset to replace it");
  }

  await db.country.createMany({ data: dataset.countries });
  await db.department.createMany({ data: dataset.departments });
  await db.level.createMany({ data: dataset.levels });
  await db.fxRate.createMany({
    data: dataset.fxRates.map((r) => ({
      fromCurrency: r.fromCurrency,
      toCurrency: "USD",
      rate: r.rate,
      rateDate: new Date(`${r.rateDate}T00:00:00.000Z`),
    })),
  });

  // Reference ids are looked up once, so the bulk inserts below never query per row.
  const countryId = new Map((await db.country.findMany()).map((c) => [c.code, c.id] as const));
  const departmentId = new Map(
    (await db.department.findMany()).map((d) => [d.name, d.id] as const),
  );
  const levelId = new Map((await db.level.findMany()).map((l) => [l.code, l.id] as const));

  await db.payBand.createMany({
    data: dataset.payBands.map((b) => ({
      levelId: requireMapped(levelId, b.levelCode),
      countryId: requireMapped(countryId, b.countryCode),
      currency: b.currency,
      minAmount: b.minAmount,
      maxAmount: b.maxAmount,
    })),
  });

  let salaryRecords = 0;
  let auditEvents = 0;
  for (const batch of batches(dataset.employees, BATCH_SIZE)) {
    await db.employee.createMany({
      data: batch.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        jobTitle: e.jobTitle,
        startDate: new Date(`${e.startDate}T00:00:00.000Z`),
        status: e.status,
        countryId: requireMapped(countryId, e.countryCode),
        departmentId: requireMapped(departmentId, e.departmentName),
        levelId: requireMapped(levelId, e.levelCode),
      })),
    });

    const salaries = batch.flatMap((e) =>
      e.salaries.map((s) => ({
        employeeId: e.id,
        amount: s.amount,
        currency: s.currency,
        effectiveFrom: new Date(`${s.effectiveFrom}T00:00:00.000Z`),
        createdBy: "seed",
      })),
    );
    await db.salaryRecord.createMany({ data: salaries });
    salaryRecords += salaries.length;

    // One audit event per salary record, mirroring what the API writes.
    const audit = batch.flatMap((e) =>
      e.salaries.map((s, index) => ({
        employeeId: e.id,
        action: index === 0 ? ("EMPLOYEE_CREATED" as const) : ("SALARY_CHANGED" as const),
        after: {
          employeeCode: e.employeeCode,
          amount: s.amount,
          currency: s.currency,
          effectiveFrom: s.effectiveFrom,
        },
        actor: "seed",
      })),
    );
    await db.auditLog.createMany({ data: audit });
    auditEvents += audit.length;
  }

  return {
    countries: dataset.countries.length,
    departments: dataset.departments.length,
    levels: dataset.levels.length,
    fxRates: dataset.fxRates.length,
    payBands: dataset.payBands.length,
    employees: dataset.employees.length,
    salaryRecords,
    auditEvents,
    elapsedMs: Math.round(performance.now() - started),
  };
}

function requireMapped(map: ReadonlyMap<string, number>, key: string): number {
  const id = map.get(key);
  if (id === undefined) {
    throw new Error(`seed references "${key}", which is not in the reference data`);
  }
  return id;
}
