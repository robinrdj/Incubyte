import { describe, expect, it } from "vitest";
import type { EmployeeImportRow } from "./employee-import.js";
import {
  planEmployeeImport,
  type ExistingEmployee,
  type ExistingIndex,
} from "./employee-import-plan.js";

const ada: EmployeeImportRow = {
  employeeCode: "EMP-000001",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@acme.test",
  jobTitle: "Engineer",
  countryCode: "DE",
  departmentName: "Engineering",
  levelCode: "L3",
  startDate: "2024-01-15",
  salaryAmount: 9000000,
  salaryCurrency: "EUR",
  salaryEffectiveFrom: "2024-01-15",
};

const existingAda: ExistingEmployee = {
  id: "emp-1",
  employeeCode: "EMP-000001",
  email: "ada@acme.test",
  firstName: "Ada",
  lastName: "Lovelace",
  jobTitle: "Engineer",
  countryCode: "DE",
  departmentName: "Engineering",
  levelCode: "L3",
  status: "ACTIVE",
  salaries: [{ effectiveFrom: "2024-01-15", amountMinor: 9000000, currency: "EUR" }],
};

function indexOf(...employees: ExistingEmployee[]): ExistingIndex {
  return {
    byEmail: new Map(employees.map((e) => [e.email, e])),
    byCode: new Map(employees.map((e) => [e.employeeCode, e])),
  };
}

const EMPTY: ExistingIndex = { byEmail: new Map(), byCode: new Map() };

function plan(rows: EmployeeImportRow[], index: ExistingIndex = EMPTY) {
  return planEmployeeImport(
    rows.map((row, i) => ({ line: i + 2, row })),
    index,
  );
}

describe("planEmployeeImport: creating employees", () => {
  it("creates a row that matches no existing employee", () => {
    const [result] = plan([ada]);
    expect(result).toMatchObject({ outcome: "CREATE", line: 2, errors: [] });
    expect(result?.action).toEqual({ kind: "CREATE", row: ada });
  });

  it("rejects a new email that reuses an existing employee code", () => {
    const [result] = plan([{ ...ada, email: "other@acme.test" }], indexOf(existingAda));
    expect(result?.outcome).toBe("REJECTED");
    expect(result?.errors[0]).toContain("already belongs to a different email");
  });
});

describe("planEmployeeImport: re-running an import", () => {
  it("is a no-op for an identical row, so re-running creates no duplicates", () => {
    const [result] = plan([ada], indexOf(existingAda));
    expect(result).toMatchObject({ outcome: "UNCHANGED", action: null });
  });

  it("is a no-op for an identical row even after a later salary was added", () => {
    const later: ExistingEmployee = {
      ...existingAda,
      salaries: [
        { effectiveFrom: "2025-01-15", amountMinor: 9600000, currency: "EUR" },
        { effectiveFrom: "2024-01-15", amountMinor: 9000000, currency: "EUR" },
      ],
    };
    const [result] = plan([ada], indexOf(later));
    expect(result?.outcome).toBe("UNCHANGED");
  });
});

describe("planEmployeeImport: updating employees", () => {
  it("updates only the profile fields that differ", () => {
    const [result] = plan([{ ...ada, jobTitle: "Senior Engineer" }], indexOf(existingAda));
    expect(result?.outcome).toBe("UPDATE");
    expect(result?.action).toEqual({
      kind: "UPDATE",
      employeeId: "emp-1",
      profile: { jobTitle: "Senior Engineer" },
      newSalary: null,
    });
  });

  it("leaves status unchanged when the status column is blank", () => {
    const leaving: ExistingEmployee = { ...existingAda, status: "LEAVING" };
    const [result] = plan([ada], indexOf(leaving));
    expect(result?.outcome).toBe("UNCHANGED");
  });

  it("changes status when the status column is given", () => {
    const [result] = plan([{ ...ada, status: "LEAVING" }], indexOf(existingAda));
    expect(result?.action).toMatchObject({ profile: { status: "LEAVING" } });
  });
});

describe("planEmployeeImport: salary history is append-only", () => {
  it("appends a salary dated after the current one", () => {
    const raise: EmployeeImportRow = {
      ...ada,
      salaryAmount: 9600000,
      salaryEffectiveFrom: "2025-01-15",
    };
    const [result] = plan([raise], indexOf(existingAda));
    expect(result?.action).toMatchObject({
      kind: "UPDATE",
      newSalary: { effectiveFrom: "2025-01-15", amountMinor: 9600000, currency: "EUR" },
    });
  });

  it("rejects a salary dated before the current one, which would backdate history", () => {
    const backdated: EmployeeImportRow = {
      ...ada,
      salaryAmount: 8000000,
      salaryEffectiveFrom: "2023-06-01",
    };
    const [result] = plan([backdated], indexOf(existingAda));
    expect(result?.outcome).toBe("REJECTED");
    expect(result?.errors[0]).toContain("history is not rewritten");
  });

  it("rejects a salary that conflicts with an existing record on the same date", () => {
    const conflicting: EmployeeImportRow = { ...ada, salaryAmount: 9500000 };
    const [result] = plan([conflicting], indexOf(existingAda));
    expect(result?.outcome).toBe("REJECTED");
    expect(result?.errors[0]).toContain("already recorded with a different amount");
  });
});

describe("planEmployeeImport: rejections", () => {
  it("rejects an email that belongs to an employee with a different code", () => {
    const [result] = plan([{ ...ada, employeeCode: "EMP-000099" }], indexOf(existingAda));
    expect(result?.outcome).toBe("REJECTED");
    expect(result?.errors[0]).toContain("belongs to employee EMP-000001");
  });

  it("rejects every row whose email appears twice in the file", () => {
    const results = plan([ada, { ...ada, employeeCode: "EMP-000002" }]);
    expect(results.map((r) => r.outcome)).toEqual(["REJECTED", "REJECTED"]);
    expect(results[0]?.errors[0]).toContain("appears more than once");
  });

  it("rejects every row whose employee code appears twice in the file", () => {
    const results = plan([ada, { ...ada, email: "other@acme.test" }]);
    expect(results.map((r) => r.outcome)).toEqual(["REJECTED", "REJECTED"]);
    expect(results[0]?.errors[0]).toContain("EMP-000001 appears more than once");
  });

  it("keeps valid rows when another row in the file is rejected", () => {
    const grace: EmployeeImportRow = {
      ...ada,
      employeeCode: "EMP-000002",
      email: "grace@acme.test",
    };
    const results = plan(
      [grace, { ...ada, email: "ada@acme.test", employeeCode: "EMP-000001", salaryAmount: 1 }],
      indexOf(existingAda),
    );
    expect(results.map((r) => r.outcome)).toEqual(["CREATE", "REJECTED"]);
  });
});
