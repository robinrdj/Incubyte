import { describe, expect, it } from "vitest";
import {
  findDuplicateEmails,
  isIsoDate,
  mapCsvToRows,
  MAX_IMPORT_ROWS,
  validateEmployeeRow,
  type ImportReferenceData,
  type RawEmployeeRow,
} from "../../../src/domain/employee-import.js";

const reference: ImportReferenceData = {
  countryCodes: new Set(["DE", "IN"]),
  departmentNames: new Set(["Engineering", "Finance"]),
  levelCodes: new Set(["L1", "L2", "L3"]),
  today: "2026-11-23",
};

const validRow: RawEmployeeRow = {
  employeeCode: "EMP-000001",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@acme.test",
  jobTitle: "Engineer",
  countryCode: "DE",
  departmentName: "Engineering",
  levelCode: "L3",
  startDate: "2024-01-15",
  salaryAmount: "90000.00",
  salaryCurrency: "EUR",
  salaryEffectiveFrom: "2024-01-15",
};

function withField(overrides: RawEmployeeRow): RawEmployeeRow {
  return { ...validRow, ...overrides };
}

describe("validateEmployeeRow", () => {
  it("requires an employee code, the import identity key", () => {
    const result = validateEmployeeRow(withField({ employeeCode: "" }), reference);
    expect(result).toEqual({ ok: false, error: ["employeeCode is required"] });
  });

  it("rejects a malformed employee code", () => {
    const result = validateEmployeeRow(withField({ employeeCode: "x" }), reference);
    expect(result.ok).toBe(false);
  });

  it("lower-cases the email so the same person is not matched twice by case", () => {
    const result = validateEmployeeRow(withField({ email: "Ada@ACME.test" }), reference);
    expect(result.ok && result.value.email).toBe("ada@acme.test");
  });

  it("leaves status undefined when the column is blank", () => {
    const result = validateEmployeeRow(withField({ status: "" }), reference);
    expect(result.ok && "status" in result.value).toBe(false);
  });

  it("accepts ACTIVE or LEAVING as status and rejects anything else", () => {
    const leaving = validateEmployeeRow(withField({ status: "leaving" }), reference);
    expect(leaving.ok && leaving.value.status).toBe("LEAVING");
    const invalid = validateEmployeeRow(withField({ status: "RETIRED" }), reference);
    expect(invalid.ok).toBe(false);
  });

  it("accepts a valid row and converts the salary to minor units", () => {
    const result = validateEmployeeRow(validRow, reference);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.salaryAmount).toBe(9000000);
      expect(result.value.countryCode).toBe("DE");
    }
  });

  it("trims whitespace and normalizes codes to upper case", () => {
    const result = validateEmployeeRow(
      withField({ countryCode: " de ", levelCode: "l2", salaryCurrency: "eur" }),
      reference,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.countryCode).toBe("DE");
      expect(result.value.levelCode).toBe("L2");
      expect(result.value.salaryCurrency).toBe("EUR");
    }
  });

  it("reports every problem in the row, not just the first", () => {
    const result = validateEmployeeRow(
      withField({ email: "not-an-email", countryCode: "XX", salaryAmount: "-5" }),
      reference,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        expect.arrayContaining([
          expect.stringContaining("email"),
          expect.stringContaining("countryCode"),
          expect.stringContaining("salaryAmount"),
        ]),
      );
      expect(result.error.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("reports a missing required field", () => {
    const result = validateEmployeeRow({ ...validRow, jobTitle: "" }, reference);
    expect(result).toEqual({ ok: false, error: ["jobTitle is required"] });
  });

  it("rejects an unknown department rather than creating one", () => {
    const result = validateEmployeeRow(withField({ departmentName: "Marketing" }), reference);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error[0]).toContain("not a known department");
    }
  });

  it("rejects an impossible calendar date", () => {
    const result = validateEmployeeRow(withField({ startDate: "2024-02-30" }), reference);
    expect(result.ok).toBe(false);
  });

  it("rejects a start date in the future relative to the injected today", () => {
    const result = validateEmployeeRow(withField({ startDate: "2027-01-01" }), reference);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.join(" ")).toContain("in the future");
    }
  });

  it("rejects a salary effective before the start date", () => {
    const result = validateEmployeeRow(
      withField({ startDate: "2024-06-01", salaryEffectiveFrom: "2024-01-01" }),
      reference,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.join(" ")).toContain("before startDate");
    }
  });

  it("rejects a salary amount with more than two decimal places", () => {
    const result = validateEmployeeRow(withField({ salaryAmount: "90000.123" }), reference);
    expect(result.ok).toBe(false);
  });
});

describe("isIsoDate", () => {
  it.each(["2024-01-15", "2024-02-29"])("accepts %s", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(["2023-02-29", "2024-13-01", "15/01/2024", "2024-1-5", ""])("rejects %j", (value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe("findDuplicateEmails", () => {
  it("returns an email that appears more than once", () => {
    expect(findDuplicateEmails(["a@x.test", "b@x.test", "a@x.test"])).toEqual(["a@x.test"]);
  });

  it("treats emails case-insensitively and ignores surrounding whitespace", () => {
    expect(findDuplicateEmails(["Ada@Acme.test", " ada@acme.test "])).toEqual(["ada@acme.test"]);
  });

  it("lists each duplicate once, however many times it repeats", () => {
    expect(findDuplicateEmails(["a@x.test", "a@x.test", "a@x.test"])).toEqual(["a@x.test"]);
  });

  it("returns an empty list when every email is unique", () => {
    expect(findDuplicateEmails(["a@x.test", "b@x.test"])).toEqual([]);
  });

  it("ignores blank emails rather than treating them as duplicates", () => {
    expect(findDuplicateEmails(["", "  ", ""])).toEqual([]);
  });
});

describe("mapCsvToRows", () => {
  const header = [
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
  ];
  const dataRow = [
    "EMP-000001",
    "Ada",
    "Lovelace",
    "ada@acme.test",
    "Engineer",
    "DE",
    "Engineering",
    "L3",
    "2024-01-15",
    "",
    "90000.00",
    "EUR",
    "2024-01-15",
  ];

  it("maps rows to named fields, numbering the first data row as record 2", () => {
    const result = mapCsvToRows([header, dataRow]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.line).toBe(2);
      expect(result.value[0]?.raw["email"]).toBe("ada@acme.test");
    }
  });

  it("matches header names case-insensitively", () => {
    const shouted = header.map((name) => name.toUpperCase());
    expect(mapCsvToRows([shouted, dataRow]).ok).toBe(true);
  });

  it("reports missing required columns", () => {
    const withoutSalary = header.filter((name) => name !== "salaryAmount");
    const result = mapCsvToRows([withoutSalary]);
    expect(result).toEqual({ ok: false, error: ["missing required column(s): salaryAmount"] });
  });

  it("rejects unknown columns so a typo does not pass silently", () => {
    const result = mapCsvToRows([[...header, "salary_amount"]]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.join(" ")).toContain("unknown column(s): salary_amount");
    }
  });

  it("fails for an empty file", () => {
    expect(mapCsvToRows([])).toEqual({ ok: false, error: ["the file is empty"] });
  });

  it("rejects a file over the row limit", () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => dataRow);
    const result = mapCsvToRows([header, ...rows]);
    expect(result.ok).toBe(false);
  });
});
