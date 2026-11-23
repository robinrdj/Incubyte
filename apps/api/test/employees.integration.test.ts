import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { EmployeeService } from "../src/services/employee-service.js";
import {
  AUTH_HEADER,
  FIXED_NOW,
  TEST_CREDENTIALS,
  createTestClient,
  employeeBody,
  resetDatabase,
} from "./helpers.js";

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  prisma = createTestClient();
  app = createApp({
    service: new EmployeeService(prisma, () => FIXED_NOW),
    credentials: TEST_CREDENTIALS,
  });
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(() => prisma.$disconnect());

/** Creates an employee through the API and returns the response body. */
async function createEmployee(overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post("/api/employees")
    .set("Authorization", AUTH_HEADER)
    .send(employeeBody(overrides));
  expect(response.status).toBe(201);
  return response.body as { id: string };
}

describe("authentication", () => {
  it("rejects requests without credentials", async () => {
    const response = await request(app).get("/api/employees");
    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("Basic");
  });

  it("rejects a wrong password", async () => {
    const wrong = `Basic ${Buffer.from("hr:not-the-password").toString("base64")}`;
    const response = await request(app).get("/api/employees").set("Authorization", wrong);
    expect(response.status).toBe(401);
  });

  it("rejects malformed credentials", async () => {
    const response = await request(app)
      .get("/api/employees")
      .set("Authorization", `Basic ${Buffer.from("no-separator").toString("base64")}`);
    expect(response.status).toBe(401);
  });

  it("leaves the health check public", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "salary-management-api" });
  });
});

describe("creating an employee", () => {
  it("creates the employee with an opening salary and returns it", async () => {
    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(employeeBody());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      employeeCode: "EMP-000001",
      email: "ada@acme.test",
      startDate: "2024-01-15",
      status: "ACTIVE",
      country: { code: "DE", name: "Germany" },
      department: { name: "Engineering" },
      level: { code: "L3", rank: 3 },
      currentSalary: { amount: "90000.00", currency: "EUR", effectiveFrom: "2024-01-15" },
    });
  });

  it("writes an EMPLOYEE_CREATED audit event attributed to the caller", async () => {
    const created = await createEmployee();

    const events = await prisma.auditLog.findMany({ where: { employeeId: created.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: "EMPLOYEE_CREATED", actor: TEST_CREDENTIALS.user });
  });

  it("rejects a duplicate email, ignoring case", async () => {
    await createEmployee();

    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(employeeBody({ employeeCode: "EMP-000002", email: "ADA@acme.test" }));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("email");
  });

  it("rejects a duplicate employee code", async () => {
    await createEmployee();

    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(employeeBody({ email: "grace@acme.test" }));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("employee code");
  });

  it("rejects an unknown country instead of creating one", async () => {
    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(employeeBody({ countryCode: "FR" }));

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("countryCode");
    expect(await prisma.country.count({ where: { code: "FR" } })).toBe(0);
  });

  it("returns field-level details for an invalid salary amount", async () => {
    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(
        employeeBody({
          salary: { amount: "90000.123", currency: "EUR", effectiveFrom: "2024-01-15" },
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.details).toEqual([
      expect.objectContaining({ field: "salary.amount" }),
    ]);
  });

  it("rejects a salary dated before the start date", async () => {
    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(
        employeeBody({
          startDate: "2024-06-01",
          salary: { amount: "90000.00", currency: "EUR", effectiveFrom: "2024-01-01" },
        }),
      );

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("before startDate");
  });

  it("rejects a salary dated in the future", async () => {
    const response = await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(
        employeeBody({
          salary: { amount: "90000.00", currency: "EUR", effectiveFrom: "2027-01-01" },
        }),
      );

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("in the future");
  });
});

describe("listing employees", () => {
  beforeEach(async () => {
    await createEmployee({
      employeeCode: "EMP-000001",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@acme.test",
    });
    await createEmployee({
      employeeCode: "EMP-000002",
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@acme.test",
      countryCode: "IN",
      departmentName: "Finance",
      levelCode: "L1",
    });
    await createEmployee({
      employeeCode: "EMP-000003",
      firstName: "Alan",
      lastName: "Turing",
      email: "alan@acme.test",
    });
  });

  it("paginates with a total count, ordered by last name", async () => {
    const firstPage = await request(app)
      .get("/api/employees?pageSize=2&page=1")
      .set("Authorization", AUTH_HEADER);
    const secondPage = await request(app)
      .get("/api/employees?pageSize=2&page=2")
      .set("Authorization", AUTH_HEADER);

    expect(firstPage.body.total).toBe(3);
    expect(firstPage.body.items.map((e: { lastName: string }) => e.lastName)).toEqual([
      "Hopper",
      "Lovelace",
    ]);
    expect(secondPage.body.items.map((e: { lastName: string }) => e.lastName)).toEqual(["Turing"]);
  });

  it("filters by country, department, and level", async () => {
    const byCountry = await request(app)
      .get("/api/employees?countryCode=IN")
      .set("Authorization", AUTH_HEADER);
    const byDepartment = await request(app)
      .get("/api/employees?departmentName=Finance")
      .set("Authorization", AUTH_HEADER);
    const byLevel = await request(app)
      .get("/api/employees?levelCode=L3")
      .set("Authorization", AUTH_HEADER);

    expect(byCountry.body.total).toBe(1);
    expect(byDepartment.body.total).toBe(1);
    expect(byLevel.body.total).toBe(2);
  });

  it("searches names and email case-insensitively", async () => {
    const response = await request(app)
      .get("/api/employees?search=TURING")
      .set("Authorization", AUTH_HEADER);
    expect(response.body.items.map((e: { firstName: string }) => e.firstName)).toEqual(["Alan"]);
  });

  it("filters by status", async () => {
    const employee = await createEmployee({
      employeeCode: "EMP-000004",
      email: "leaving@acme.test",
      firstName: "Leaving",
      lastName: "Person",
    });
    await request(app)
      .patch(`/api/employees/${employee.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ status: "LEAVING" });

    const response = await request(app)
      .get("/api/employees?status=LEAVING")
      .set("Authorization", AUTH_HEADER);
    expect(response.body.total).toBe(1);
  });

  it("rejects a page size above the maximum", async () => {
    const response = await request(app)
      .get("/api/employees?pageSize=500")
      .set("Authorization", AUTH_HEADER);
    expect(response.status).toBe(400);
  });
});

describe("updating an employee", () => {
  it("updates the job title and audits only the changed field", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .patch(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ jobTitle: "Senior Engineer" });

    expect(response.status).toBe(200);
    expect(response.body.jobTitle).toBe("Senior Engineer");

    const audit = await prisma.auditLog.findFirst({
      where: { employeeId: created.id, action: "EMPLOYEE_UPDATED" },
    });
    expect(audit?.before).toEqual({ jobTitle: "Engineer" });
    expect(audit?.after).toEqual({ jobTitle: "Senior Engineer" });
  });

  it("writes no audit event when nothing actually changes", async () => {
    const created = await createEmployee();

    await request(app)
      .patch(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ jobTitle: "Engineer" });

    expect(
      await prisma.auditLog.count({
        where: { employeeId: created.id, action: "EMPLOYEE_UPDATED" },
      }),
    ).toBe(0);
  });

  it("allows an employee to keep their own email", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .patch(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ email: "ada@acme.test", firstName: "Augusta" });

    expect(response.status).toBe(200);
  });

  it("rejects an email already used by another employee", async () => {
    await createEmployee();
    const other = await createEmployee({
      employeeCode: "EMP-000002",
      email: "grace@acme.test",
    });

    const response = await request(app)
      .patch(`/api/employees/${other.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ email: "ada@acme.test" });

    expect(response.status).toBe(409);
  });

  it("rejects an unknown department", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .patch(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ departmentName: "Marketing" });

    expect(response.status).toBe(422);
  });

  it("rejects an empty update", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .patch(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown employee and 400 for a malformed id", async () => {
    const unknown = await request(app)
      .get("/api/employees/00000000-0000-4000-8000-000000000000")
      .set("Authorization", AUTH_HEADER);
    const malformed = await request(app)
      .get("/api/employees/not-a-uuid")
      .set("Authorization", AUTH_HEADER);

    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(400);
  });
});

describe("salary history (append-only)", () => {
  it("appends a salary change and makes it the current salary", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .post(`/api/employees/${created.id}/salary-changes`)
      .set("Authorization", AUTH_HEADER)
      .send({ amount: "96000.00", currency: "EUR", effectiveFrom: "2025-01-15" });
    expect(response.status).toBe(201);

    const employee = await request(app)
      .get(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER);
    expect(employee.body.currentSalary).toMatchObject({
      amount: "96000.00",
      effectiveFrom: "2025-01-15",
    });
  });

  it("never modifies an earlier salary record when a new one is added", async () => {
    const created = await createEmployee();
    const before = await prisma.salaryRecord.findFirstOrThrow({
      where: { employeeId: created.id },
    });

    await request(app)
      .post(`/api/employees/${created.id}/salary-changes`)
      .set("Authorization", AUTH_HEADER)
      .send({ amount: "96000.00", currency: "EUR", effectiveFrom: "2025-01-15" });

    const after = await prisma.salaryRecord.findUniqueOrThrow({ where: { id: before.id } });
    expect(after).toEqual(before);

    const history = await request(app)
      .get(`/api/employees/${created.id}/salary-history`)
      .set("Authorization", AUTH_HEADER);
    expect(history.body.items).toEqual([
      { amount: "90000.00", currency: "EUR", effectiveFrom: "2024-01-15" },
      { amount: "96000.00", currency: "EUR", effectiveFrom: "2025-01-15" },
    ]);
  });

  it("rejects a change dated on or before the current salary date (no backdating)", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .post(`/api/employees/${created.id}/salary-changes`)
      .set("Authorization", AUTH_HEADER)
      .send({ amount: "80000.00", currency: "EUR", effectiveFrom: "2024-01-15" });

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("must be after");
  });

  it("rejects a future-dated change", async () => {
    const created = await createEmployee();

    const response = await request(app)
      .post(`/api/employees/${created.id}/salary-changes`)
      .set("Authorization", AUTH_HEADER)
      .send({ amount: "96000.00", currency: "EUR", effectiveFrom: "2027-01-01" });

    expect(response.status).toBe(422);
  });

  it("audits each salary change with before and after values", async () => {
    const created = await createEmployee();

    await request(app)
      .post(`/api/employees/${created.id}/salary-changes`)
      .set("Authorization", AUTH_HEADER)
      .send({ amount: "96000.00", currency: "EUR", effectiveFrom: "2025-01-15" });

    const audit = await prisma.auditLog.findFirst({
      where: { employeeId: created.id, action: "SALARY_CHANGED" },
    });
    expect(audit?.actor).toBe(TEST_CREDENTIALS.user);
    expect(audit?.before).toEqual({
      amount: "90000.00",
      currency: "EUR",
      effectiveFrom: "2024-01-15",
    });
    expect(audit?.after).toEqual({
      amount: "96000.00",
      currency: "EUR",
      effectiveFrom: "2025-01-15",
    });
  });

  it("exposes no route that edits or deletes a salary record", async () => {
    const created = await createEmployee();
    const record = await prisma.salaryRecord.findFirstOrThrow({
      where: { employeeId: created.id },
    });
    const path = `/api/salary-records/${record.id}`;

    const put = await request(app).put(path).set("Authorization", AUTH_HEADER).send({});
    const patch = await request(app).patch(path).set("Authorization", AUTH_HEADER).send({});
    const remove = await request(app).delete(path).set("Authorization", AUTH_HEADER);

    expect([put.status, patch.status, remove.status]).toEqual([404, 404, 404]);
    expect(await prisma.salaryRecord.count({ where: { id: record.id } })).toBe(1);
  });
});

describe("audit trail", () => {
  it("lists every change to an employee, attributed to the actor", async () => {
    const created = await createEmployee();
    await request(app)
      .patch(`/api/employees/${created.id}`)
      .set("Authorization", AUTH_HEADER)
      .send({ jobTitle: "Principal Engineer" });
    await request(app)
      .post(`/api/employees/${created.id}/salary-changes`)
      .set("Authorization", AUTH_HEADER)
      .send({ amount: "120000.00", currency: "EUR", effectiveFrom: "2025-06-01" });

    const response = await request(app)
      .get(`/api/employees/${created.id}/audit`)
      .set("Authorization", AUTH_HEADER);

    const actions = response.body.items.map((event: { action: string }) => event.action);
    expect(actions.sort()).toEqual(["EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "SALARY_CHANGED"]);
    expect(
      response.body.items.every(
        (event: { actor: string }) => event.actor === TEST_CREDENTIALS.user,
      ),
    ).toBe(true);
  });
});
