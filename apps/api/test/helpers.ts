import { createPrismaClient } from "../src/db/prisma.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";

/** Fixed "today" so date validation is deterministic. */
export const FIXED_NOW = new Date("2026-11-23T12:00:00Z");

export const TEST_CREDENTIALS = { user: "hr.manager@acme.test", password: "test-password-12345" };

export const AUTH_HEADER = `Basic ${Buffer.from(
  `${TEST_CREDENTIALS.user}:${TEST_CREDENTIALS.password}`,
).toString("base64")}`;

/** Returns a client for the test database. Throws unless the URL names a *_test database. */
export function createTestClient(): PrismaClient {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required to run integration tests.");
  }
  const databaseName = new URL(url).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests against "${databaseName}".`);
  }
  return createPrismaClient(url);
}

const TABLES = [
  "AuditLog",
  "SalaryRecord",
  "PayBand",
  "FxRate",
  "Employee",
  "Country",
  "Department",
  "Level",
];

/** Empties every domain table and restores the fixed reference data used by the tests. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  await prisma.country.createMany({
    data: [
      { code: "DE", name: "Germany", currency: "EUR" },
      { code: "IN", name: "India", currency: "INR" },
    ],
  });
  await prisma.department.createMany({
    data: [{ name: "Engineering" }, { name: "Finance" }],
  });
  await prisma.level.createMany({
    data: [
      { code: "L1", rank: 1 },
      { code: "L2", rank: 2 },
      { code: "L3", rank: 3 },
    ],
  });
}

/** A valid create-employee request body. Tests override only the fields they care about. */
export function employeeBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    employeeCode: "EMP-000001",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@acme.test",
    jobTitle: "Engineer",
    countryCode: "DE",
    departmentName: "Engineering",
    levelCode: "L3",
    startDate: "2024-01-15",
    salary: { amount: "90000.00", currency: "EUR", effectiveFrom: "2024-01-15" },
    ...overrides,
  };
}
