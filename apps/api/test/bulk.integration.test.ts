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

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(() => prisma.$disconnect());

const HEADER = [
  "employeeCode",
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "countryCode",
  "departmentName",
  "levelCode",
  "startDate",
  "status",
  "salaryAmount",
  "salaryCurrency",
  "salaryEffectiveFrom",
].join(",");

const ADA =
  "EMP-000001,Ada,Lovelace,ada@acme.test,Engineer,DE,Engineering,L3,2024-01-15,,90000.00,EUR,2024-01-15";
const GRACE =
  "EMP-000002,Grace,Hopper,grace@acme.test,Engineer,IN,Finance,L2,2024-02-01,,2500000.00,INR,2024-02-01";
const ALAN =
  "EMP-000003,Alan,Turing,alan@acme.test,Analyst,DE,Finance,L1,2024-03-01,,60000.00,EUR,2024-03-01";

/** Builds a CSV file: header plus the given data lines. */
const csv = (...lines: string[]): string => [HEADER, ...lines].join("\r\n");

function importCsv(body: string, query = "") {
  return request(app)
    .post(`/api/employees/import${query}`)
    .set("Authorization", AUTH_HEADER)
    .set("Content-Type", "text/csv")
    .send(body);
}

describe("CSV import: valid and invalid rows", () => {
  it("creates every valid row, with an audit event for each", async () => {
    const response = await importCsv(csv(ADA, GRACE));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      dryRun: false,
      totalRows: 2,
      created: 2,
      updated: 0,
      unchanged: 0,
      rejected: 0,
      errors: [],
    });
    expect(await prisma.employee.count()).toBe(2);
    expect(await prisma.auditLog.count({ where: { action: "EMPLOYEE_CREATED" } })).toBe(2);
  });

  it("applies the valid rows and reports rejected rows by line number", async () => {
    const badCountry =
      "EMP-000009,Bad,Row,bad@acme.test,Engineer,FR,Engineering,L3,2024-01-15,,1.00,EUR,2024-01-15";
    const response = await importCsv(csv(ADA, badCountry, ALAN));

    expect(response.body.created).toBe(2);
    expect(response.body.rejected).toBe(1);
    expect(response.body.errors).toEqual([
      {
        line: 3,
        email: "bad@acme.test",
        messages: [expect.stringContaining('countryCode "FR" is not a known country')],
      },
    ]);
    expect(await prisma.employee.findUnique({ where: { email: "bad@acme.test" } })).toBeNull();
    expect(await prisma.employee.count()).toBe(2);
  });

  it("reports every problem in a row, not just the first", async () => {
    const broken =
      "EMP-000009,,Row,not-an-email,Engineer,DE,Engineering,L3,2024-13-01,,abc,EUR,2024-01-15";
    const response = await importCsv(csv(broken));

    expect(response.body.rejected).toBe(1);
    expect(response.body.errors[0].messages.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects every row whose email appears twice in the file", async () => {
    const duplicate =
      "EMP-000004,Ada,Again,ada@acme.test,Engineer,DE,Engineering,L3,2024-01-15,,90000.00,EUR,2024-01-15";
    const response = await importCsv(csv(ADA, duplicate));

    expect(response.body.created).toBe(0);
    expect(response.body.rejected).toBe(2);
    expect(await prisma.employee.count()).toBe(0);
  });

  it("rejects a row whose employee code already belongs to a different email", async () => {
    await importCsv(csv(ADA));
    const clash =
      "EMP-000001,Someone,Else,someone@acme.test,Engineer,DE,Engineering,L3,2024-01-15,,90000.00,EUR,2024-01-15";

    const response = await importCsv(csv(clash));

    expect(response.body.rejected).toBe(1);
    expect(response.body.errors[0].messages[0]).toContain("already belongs to a different email");
  });
});

describe("CSV import: re-running is safe", () => {
  it("creates no duplicates when the same file is imported twice", async () => {
    await importCsv(csv(ADA, GRACE));
    const second = await importCsv(csv(ADA, GRACE));

    expect(second.body).toMatchObject({ created: 0, updated: 0, unchanged: 2, rejected: 0 });
    expect(await prisma.employee.count()).toBe(2);
    expect(await prisma.salaryRecord.count()).toBe(2);
    expect(await prisma.auditLog.count()).toBe(2);
  });

  it("updates a changed profile field and audits only that field", async () => {
    await importCsv(csv(ADA));
    const promoted = ADA.replace("Engineer,DE", "Senior Engineer,DE");

    const response = await importCsv(csv(promoted));

    expect(response.body).toMatchObject({ updated: 1, unchanged: 0 });
    const audit = await prisma.auditLog.findFirst({ where: { action: "EMPLOYEE_UPDATED" } });
    expect(audit?.before).toEqual({ jobTitle: "Engineer" });
    expect(audit?.after).toEqual({ jobTitle: "Senior Engineer" });
  });

  it("appends a later salary and keeps the earlier record unchanged", async () => {
    await importCsv(csv(ADA));
    const raise = ADA.replace("90000.00,EUR,2024-01-15", "96000.00,EUR,2025-01-15");

    const response = await importCsv(csv(raise));

    expect(response.body.updated).toBe(1);
    const history = await prisma.salaryRecord.findMany({ orderBy: { effectiveFrom: "asc" } });
    expect(history.map((r) => r.amount.toFixed(2))).toEqual(["90000.00", "96000.00"]);
  });

  it("rejects a salary dated before the current one and changes nothing", async () => {
    // Current salary becomes 2025-01-15. A row dated 2024-06-01 is after the start date, so only
    // the history rule can reject it.
    await importCsv(csv(ADA));
    await importCsv(csv(ADA.replace("90000.00,EUR,2024-01-15", "96000.00,EUR,2025-01-15")));
    const backdated = ADA.replace("90000.00,EUR,2024-01-15", "70000.00,EUR,2024-06-01");

    const response = await importCsv(csv(backdated));

    expect(response.body.rejected).toBe(1);
    expect(response.body.errors[0].messages[0]).toContain("history is not rewritten");
    expect(await prisma.salaryRecord.count()).toBe(2);
  });

  it("rejects a salary dated before the start date at validation", async () => {
    const response = await importCsv(
      csv(ADA.replace("90000.00,EUR,2024-01-15", "70000.00,EUR,2023-06-01")),
    );
    expect(response.body.errors[0].messages[0]).toContain("before startDate");
    expect(await prisma.employee.count()).toBe(0);
  });

  it("treats a re-run after a later salary as unchanged for the original row", async () => {
    await importCsv(csv(ADA));
    await importCsv(csv(ADA.replace("90000.00,EUR,2024-01-15", "96000.00,EUR,2025-01-15")));

    const rerun = await importCsv(csv(ADA));

    expect(rerun.body).toMatchObject({ rejected: 0, unchanged: 1 });
    expect(await prisma.salaryRecord.count()).toBe(2);
  });
});

describe("CSV import: dry run and malformed input", () => {
  it("reports what would happen without writing anything", async () => {
    const response = await importCsv(csv(ADA, GRACE), "?dryRun=true");

    expect(response.body).toMatchObject({ dryRun: true, created: 2, rejected: 0 });
    expect(await prisma.employee.count()).toBe(0);
  });

  it("rejects a file missing a required column, naming the column", async () => {
    const withoutSalary = [HEADER.replace(",salaryAmount", ""), ADA.replace(",90000.00", "")].join(
      "\r\n",
    );

    const response = await importCsv(withoutSalary);

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("salaryAmount");
  });

  it("rejects a file with a misspelled column", async () => {
    const misspelled = HEADER.replace("salaryAmount", "salary_amount");

    const response = await importCsv([misspelled, ADA].join("\r\n"));

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("salary_amount");
  });

  it("rejects malformed CSV", async () => {
    const response = await importCsv(`${HEADER}\r\n"unterminated,row`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("MALFORMED_CSV");
  });

  it("rejects a body that is not text/csv", async () => {
    const response = await request(app)
      .post("/api/employees/import")
      .set("Authorization", AUTH_HEADER)
      .send({ not: "a csv" });

    expect(response.status).toBe(415);
  });

  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/employees/import")
      .set("Content-Type", "text/csv")
      .send(csv(ADA));
    expect(response.status).toBe(401);
  });
});

describe("CSV export", () => {
  beforeEach(async () => {
    await importCsv(csv(ADA, GRACE, ALAN));
  });

  it("exports employees matching the filters, in the import column order", async () => {
    const response = await request(app)
      .get("/api/employees/export.csv?countryCode=IN")
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toContain("employees.csv");
    const lines = response.text.trim().split("\r\n");
    expect(lines[0]).toBe(HEADER);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("EMP-000002");
  });

  it("exports the current salary, not an earlier one", async () => {
    await importCsv(csv(ADA.replace("90000.00,EUR,2024-01-15", "96000.00,EUR,2025-01-15")));

    const response = await request(app)
      .get("/api/employees/export.csv?search=Ada")
      .set("Authorization", AUTH_HEADER);

    expect(response.text).toContain("96000.00,EUR,2025-01-15");
  });

  it("round-trips: an exported file imports back as unchanged", async () => {
    const exported = await request(app)
      .get("/api/employees/export.csv")
      .set("Authorization", AUTH_HEADER);

    const reimport = await importCsv(exported.text);

    expect(reimport.body).toMatchObject({
      totalRows: 3,
      created: 0,
      updated: 0,
      unchanged: 3,
      rejected: 0,
    });
  });

  it("neutralizes formula-like names so the file cannot run code in a spreadsheet", async () => {
    await importCsv(
      csv(
        "EMP-000009,=HYPERLINK,Evil,evil@acme.test,Engineer,DE,Engineering,L3,2024-01-15,,1.00,EUR,2024-01-15",
      ),
    );

    const response = await request(app)
      .get("/api/employees/export.csv?search=evil")
      .set("Authorization", AUTH_HEADER);

    expect(response.text).toContain("'=HYPERLINK");
  });
});
