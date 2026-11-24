import { hashPassword } from "../../src/auth/passwords.js";
import { hashToken } from "../../src/auth/tokens.js";
import { createPrismaClient } from "../../src/db/prisma.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { createApp } from "../../src/http/app.js";
import { AnalyticsService } from "../../src/services/analytics-service.js";
import { AuthService } from "../../src/services/auth-service.js";
import { BulkExchangeService } from "../../src/services/bulk-exchange-service.js";
import { EmployeeService } from "../../src/services/employee-service.js";
import { SettingsService } from "../../src/services/settings-service.js";
import { UserService } from "../../src/services/user-service.js";

/** Fixed "today" so date validation and session expiry are deterministic. */
export const FIXED_NOW = new Date("2026-11-23T12:00:00Z");

export const TEST_USER = {
  name: "Test HR",
  email: "hr.manager@acme.test",
  password: "test-password-12345",
};

/** A session that every reset creates for TEST_USER, so tests can call the API directly. */
const TEST_TOKEN = "integration-test-session-token";
export const AUTH_HEADER = `Bearer ${TEST_TOKEN}`;

let testPasswordHash: Promise<string> | undefined;

export function createTestApp(prisma: PrismaClient, corsOrigins: readonly string[] = []) {
  const clock = () => FIXED_NOW;
  return createApp({
    employees: new EmployeeService(prisma, clock),
    analytics: new AnalyticsService(prisma, clock),
    bulk: new BulkExchangeService(prisma, clock),
    settings: new SettingsService(prisma),
    auth: new AuthService(prisma, clock),
    users: new UserService(prisma),
    corsOrigins,
  });
}

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
  "Session",
  "HrUser",
  "AuditLog",
  "SalaryRecord",
  "PayBand",
  "FxRate",
  "Employee",
  "Country",
  "Department",
  "Level",
];

/** Empties every table, then restores the reference data and the signed-in test user. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  testPasswordHash ??= hashPassword(TEST_USER.password);
  await prisma.hrUser.create({
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      passwordHash: await testPasswordHash,
      sessions: {
        create: {
          tokenHash: hashToken(TEST_TOKEN),
          expiresAt: new Date(FIXED_NOW.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
  });
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
