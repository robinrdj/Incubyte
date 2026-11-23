import { describe, expect, it } from "vitest";
import {
  findDuplicateEmails,
  isIsoDate,
  validateEmployeeRow,
  type ImportReferenceData,
  type RawEmployeeRow,
} from "./employee-import.js";

const reference: ImportReferenceData = {
  countryCodes: new Set(["DE", "IN"]),
  departmentNames: new Set(["Engineering", "Finance"]),
  levelCodes: new Set(["L1", "L2", "L3"]),
  today: "2026-11-23",
};

const validRow: RawEmployeeRow = {
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
