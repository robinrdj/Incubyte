import { EMPLOYEE_CSV_COLUMNS } from "@salary/shared";
import { parseMoney, type MinorUnits } from "./money.js";
import { fail, ok, type Result } from "./result.js";

/** Upper bound on data rows in one import. Larger files should be split. */
export const MAX_IMPORT_ROWS = 10_000;

export type EmploymentStatus = "ACTIVE" | "LEAVING";

export interface EmployeeImportRow {
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  /** Lower case. */
  readonly email: string;
  readonly jobTitle: string;
  readonly countryCode: string;
  readonly departmentName: string;
  readonly levelCode: string;
  readonly startDate: string;
  /** Absent when blank, which keeps the current status. */
  readonly status?: EmploymentStatus;
  readonly salaryAmount: MinorUnits;
  readonly salaryCurrency: string;
  readonly salaryEffectiveFrom: string;
}

/** Unknown codes are errors, not created. */
export interface ImportReferenceData {
  readonly countryCodes: ReadonlySet<string>;
  readonly departmentNames: ReadonlySet<string>;
  readonly levelCodes: ReadonlySet<string>;
  /** Injected, so validation is deterministic. */
  readonly today: string;
}

export type RawEmployeeRow = Readonly<Record<string, string | undefined>>;

/** Column names the import understands, in the order the export writes them. */
export const IMPORT_COLUMNS = EMPLOYEE_CSV_COLUMNS;

const REQUIRED_COLUMNS: readonly string[] = IMPORT_COLUMNS.filter((c) => c !== "status");

const EMPLOYEE_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

/** True for a real calendar date in YYYY-MM-DD form (rejects 2024-02-30). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Collects every problem in the row, so they can be fixed together. */
export function validateEmployeeRow(
  raw: RawEmployeeRow,
  reference: ImportReferenceData,
): Result<EmployeeImportRow, string[]> {
  const errors: string[] = [];
  const value = (field: string): string => (raw[field] ?? "").trim();

  for (const field of REQUIRED_COLUMNS) {
    if (value(field) === "") {
      errors.push(`${field} is required`);
    }
  }

  const employeeCode = value("employeeCode").toUpperCase();
  if (employeeCode !== "" && !EMPLOYEE_CODE_PATTERN.test(employeeCode)) {
    errors.push(`employeeCode "${employeeCode}" must be 3 to 20 letters, digits, or hyphens`);
  }

  const email = value("email").toLowerCase();
  if (email !== "" && !EMAIL_PATTERN.test(email)) {
    errors.push(`email "${email}" is not valid`);
  }

  const countryCode = value("countryCode").toUpperCase();
  if (
    countryCode !== "" &&
    (!COUNTRY_PATTERN.test(countryCode) || !reference.countryCodes.has(countryCode))
  ) {
    errors.push(`countryCode "${countryCode}" is not a known country`);
  }

  const departmentName = value("departmentName");
  if (departmentName !== "" && !reference.departmentNames.has(departmentName)) {
    errors.push(`departmentName "${departmentName}" is not a known department`);
  }

  const levelCode = value("levelCode").toUpperCase();
  if (levelCode !== "" && !reference.levelCodes.has(levelCode)) {
    errors.push(`levelCode "${levelCode}" is not a known level`);
  }

  const startDate = value("startDate");
  if (startDate !== "") {
    if (!isIsoDate(startDate)) {
      errors.push(`startDate "${startDate}" must be a real date in YYYY-MM-DD form`);
    } else if (startDate > reference.today) {
      errors.push(`startDate ${startDate} is in the future`);
    }
  }

  const statusText = value("status").toUpperCase();
  if (statusText !== "" && statusText !== "ACTIVE" && statusText !== "LEAVING") {
    errors.push(`status "${statusText}" must be ACTIVE or LEAVING`);
  }

  const salaryEffectiveFrom = value("salaryEffectiveFrom");
  if (salaryEffectiveFrom !== "") {
    if (!isIsoDate(salaryEffectiveFrom)) {
      errors.push(
        `salaryEffectiveFrom "${salaryEffectiveFrom}" must be a real date in YYYY-MM-DD form`,
      );
    } else {
      if (salaryEffectiveFrom > reference.today) {
        errors.push(`salaryEffectiveFrom ${salaryEffectiveFrom} is in the future`);
      }
      if (isIsoDate(startDate) && salaryEffectiveFrom < startDate) {
        errors.push(`salaryEffectiveFrom ${salaryEffectiveFrom} is before startDate`);
      }
    }
  }

  const salaryCurrency = value("salaryCurrency").toUpperCase();
  if (salaryCurrency !== "" && !CURRENCY_PATTERN.test(salaryCurrency)) {
    errors.push(`salaryCurrency "${salaryCurrency}" must be a three-letter ISO code`);
  }

  let salaryAmount: MinorUnits | undefined;
  const amountText = value("salaryAmount");
  if (amountText !== "") {
    const parsed = parseMoney(amountText);
    if (parsed.ok) {
      salaryAmount = parsed.value;
    } else {
      errors.push(`salaryAmount: ${parsed.error}`);
    }
  }

  if (errors.length > 0 || salaryAmount === undefined) {
    return fail(errors.length > 0 ? errors : ["salaryAmount is required"]);
  }

  const status = statusText === "" ? undefined : (statusText as EmploymentStatus);
  return ok({
    employeeCode,
    firstName: value("firstName"),
    lastName: value("lastName"),
    email,
    jobTitle: value("jobTitle"),
    countryCode,
    departmentName,
    levelCode,
    startDate,
    ...(status === undefined ? {} : { status }),
    salaryAmount,
    salaryCurrency,
    salaryEffectiveFrom,
  });
}

export interface MappedCsvRow {
  /** The header is record 1, so data starts at record 2. */
  readonly line: number;
  readonly raw: RawEmployeeRow;
}

/** Header names match case-insensitively; unknown or missing columns fail the file. */
export function mapCsvToRows(
  table: readonly (readonly string[])[],
): Result<MappedCsvRow[], string[]> {
  const header = table[0];
  if (!header) {
    return fail(["the file is empty"]);
  }

  const canonical = new Map(IMPORT_COLUMNS.map((name) => [name.toLowerCase(), name]));
  const columns: string[] = [];
  const unknown: string[] = [];
  for (const cell of header) {
    const name = canonical.get(cell.trim().toLowerCase());
    if (name) {
      columns.push(name);
    } else {
      unknown.push(cell.trim());
    }
  }

  const errors: string[] = [];
  if (unknown.length > 0) {
    errors.push(`unknown column(s): ${unknown.join(", ")}`);
  }
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length > 0) {
    errors.push(`missing required column(s): ${missing.join(", ")}`);
  }
  if (errors.length > 0) {
    return fail(errors);
  }

  const dataRows = table.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return fail([
      `the file has ${String(dataRows.length)} rows; the limit is ${String(MAX_IMPORT_ROWS)}`,
    ]);
  }

  return ok(
    dataRows.map((cells, index) => {
      const raw: Record<string, string> = {};
      columns.forEach((name, column) => {
        raw[name] = cells[column] ?? "";
      });
      return { line: index + 2, raw };
    }),
  );
}

/** Emails used more than once, in lower case and sorted. */
export function findDuplicateEmails(emails: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (normalized === "") {
      continue;
    }
    if (seen.has(normalized)) {
      duplicates.add(normalized);
    }
    seen.add(normalized);
  }
  return [...duplicates].sort();
}
