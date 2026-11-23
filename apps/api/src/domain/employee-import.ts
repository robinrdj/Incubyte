import { parseMoney, type MinorUnits } from "./money.js";
import { fail, ok, type Result } from "./result.js";

/** One validated employee row from a CSV import, with salary and reference codes resolved to values. */
export interface EmployeeImportRow {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly jobTitle: string;
  readonly countryCode: string;
  readonly departmentName: string;
  readonly levelCode: string;
  readonly startDate: string;
  readonly salaryAmount: MinorUnits;
  readonly salaryCurrency: string;
  readonly salaryEffectiveFrom: string;
}

/** Reference data the import is checked against. Unknown codes are errors, not silently created. */
export interface ImportReferenceData {
  readonly countryCodes: ReadonlySet<string>;
  readonly departmentNames: ReadonlySet<string>;
  readonly levelCodes: ReadonlySet<string>;
  /** Today's date as YYYY-MM-DD. Injected so validation is deterministic. */
  readonly today: string;
}

export type RawEmployeeRow = Readonly<Record<string, string | undefined>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "countryCode",
  "departmentName",
  "levelCode",
  "startDate",
  "salaryAmount",
  "salaryCurrency",
  "salaryEffectiveFrom",
] as const;

/** True for a real calendar date in YYYY-MM-DD form (rejects 2024-02-30). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates one CSV row. Collects every problem in the row so the user can fix them together.
 * Returns the typed row on success, or the list of error messages on failure.
 */
export function validateEmployeeRow(
  raw: RawEmployeeRow,
  reference: ImportReferenceData,
): Result<EmployeeImportRow, string[]> {
  const errors: string[] = [];
  const value = (field: string): string => (raw[field] ?? "").trim();

  for (const field of REQUIRED_FIELDS) {
    if (value(field) === "") {
      errors.push(`${field} is required`);
    }
  }

  const email = value("email");
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

  return ok({
    firstName: value("firstName"),
    lastName: value("lastName"),
    email,
    jobTitle: value("jobTitle"),
    countryCode,
    departmentName,
    levelCode,
    startDate,
    salaryAmount,
    salaryCurrency,
    salaryEffectiveFrom,
  });
}

/**
 * Returns the emails that appear more than once in the batch, compared case-insensitively.
 * The result is sorted and each email is listed once, in lowercase.
 */
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
