import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "../src/generated/prisma/client.js";
import { createPrismaClient } from "../src/db/prisma.js";

const testUrl = process.env["TEST_DATABASE_URL"];
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is required to run integration tests.");
}
// Guard: integration tests truncate tables, so refuse to run against anything but a *_test database.
const databaseName = new URL(testUrl).pathname.slice(1);
if (!databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to run integration tests against "${databaseName}". Use a *_test database.`,
  );
}

const prisma = createPrismaClient(testUrl);

const DOMAIN_TABLES = [
  "AuditLog",
  "Country",
  "Department",
  "Employee",
  "FxRate",
  "Level",
  "PayBand",
  "SalaryRecord",
];

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${DOMAIN_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

async function seedEmployee(email = "ada@acme.test") {
  const country = await prisma.country.create({
    data: { code: "DE", name: "Germany", currency: "EUR" },
  });
  const department = await prisma.department.create({ data: { name: "Engineering" } });
  const level = await prisma.level.create({ data: { code: "L3", rank: 3 } });
  const employee = await prisma.employee.create({
    data: {
      employeeCode: "EMP-000001",
      firstName: "Ada",
      lastName: "Lovelace",
      email,
      jobTitle: "Engineer",
      startDate: new Date("2024-01-15"),
      countryId: country.id,
      departmentId: department.id,
      levelId: level.id,
    },
  });
  return employee;
}

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("database schema (migrated test database)", () => {
  it("creates every domain table", async () => {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const tables = rows.map((r) => r.tablename);
    expect(tables).toEqual(expect.arrayContaining(DOMAIN_TABLES));
  });

  it("indexes the employee columns used for filtering and search", async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'Employee'`;
    const indexes = rows.map((r) => r.indexname);
    expect(indexes).toEqual(
      expect.arrayContaining([
        "Employee_countryId_idx",
        "Employee_departmentId_idx",
        "Employee_levelId_idx",
        "Employee_lastName_firstName_idx",
        "Employee_status_idx",
      ]),
    );
  });

  it("rejects a second employee with the same email", async () => {
    await seedEmployee("dup@acme.test");
    const country = await prisma.country.findUniqueOrThrow({ where: { code: "DE" } });
    const department = await prisma.department.findUniqueOrThrow({
      where: { name: "Engineering" },
    });
    const level = await prisma.level.findUniqueOrThrow({ where: { code: "L3" } });

    const duplicate = prisma.employee.create({
      data: {
        employeeCode: "EMP-000002",
        firstName: "Grace",
        lastName: "Hopper",
        email: "dup@acme.test",
        jobTitle: "Engineer",
        startDate: new Date("2024-02-01"),
        countryId: country.id,
        departmentId: department.id,
        levelId: level.id,
      },
    });

    await expect(duplicate).rejects.toMatchObject({ code: "P2002" });
  });

  it("keeps salary as exact two-decimal money", async () => {
    const employee = await seedEmployee();
    await prisma.salaryRecord.create({
      data: {
        employeeId: employee.id,
        amount: new Prisma.Decimal("123456.78"),
        currency: "EUR",
        effectiveFrom: new Date("2024-01-15"),
        createdBy: "hr@acme.test",
      },
    });

    const stored = await prisma.salaryRecord.findFirstOrThrow({
      where: { employeeId: employee.id },
    });
    expect(stored.amount.toFixed(2)).toBe("123456.78");
  });

  it("rejects two salary records with the same effective date", async () => {
    const employee = await seedEmployee();
    const base = {
      employeeId: employee.id,
      amount: new Prisma.Decimal("90000.00"),
      currency: "EUR",
      effectiveFrom: new Date("2024-01-15"),
      createdBy: "hr@acme.test",
    };
    await prisma.salaryRecord.create({ data: base });

    await expect(prisma.salaryRecord.create({ data: base })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("keeps earlier salary records when a later one is added (append-only history)", async () => {
    const employee = await seedEmployee();
    const salary = (amount: string, effectiveFrom: string) => ({
      employeeId: employee.id,
      amount: new Prisma.Decimal(amount),
      currency: "EUR",
      effectiveFrom: new Date(effectiveFrom),
      createdBy: "hr@acme.test",
    });
    await prisma.salaryRecord.create({ data: salary("90000.00", "2024-01-15") });
    await prisma.salaryRecord.create({ data: salary("96000.00", "2025-01-15") });

    const history = await prisma.salaryRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: { effectiveFrom: "asc" },
    });
    expect(history.map((r) => r.amount.toFixed(2))).toEqual(["90000.00", "96000.00"]);
  });
});
