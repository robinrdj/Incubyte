import type { MinorUnits } from "./money.js";
import type { EmployeeImportRow, EmploymentStatus } from "./employee-import.js";
import { findDuplicateEmails } from "./employee-import.js";

/** A salary record as it already exists in the database. */
export interface ExistingSalary {
  readonly effectiveFrom: string;
  readonly amountMinor: MinorUnits;
  readonly currency: string;
}

/** An employee as it already exists in the database, used to decide what an import row changes. */
export interface ExistingEmployee {
  readonly id: string;
  readonly employeeCode: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly jobTitle: string;
  readonly countryCode: string;
  readonly departmentName: string;
  readonly levelCode: string;
  readonly status: EmploymentStatus;
  /** All salary records, newest effective date first. */
  readonly salaries: readonly ExistingSalary[];
}

export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  countryCode?: string;
  departmentName?: string;
  levelCode?: string;
  status?: EmploymentStatus;
}

export type PlannedAction =
  | { readonly kind: "CREATE"; readonly row: EmployeeImportRow }
  | {
      readonly kind: "UPDATE";
      readonly employeeId: string;
      readonly profile: ProfileChanges;
      readonly newSalary: ExistingSalary | null;
    };

export type RowOutcome = "CREATE" | "UPDATE" | "UNCHANGED" | "REJECTED";

export interface PlannedRow {
  readonly line: number;
  readonly email: string;
  readonly outcome: RowOutcome;
  readonly errors: readonly string[];
  readonly action: PlannedAction | null;
}

export interface ExistingIndex {
  readonly byEmail: ReadonlyMap<string, ExistingEmployee>;
  readonly byCode: ReadonlyMap<string, ExistingEmployee>;
}

/**
 * Decides what each valid import row will do. Pure: it reads only the snapshot it is given.
 *
 * Rules:
 * - Matching is by email. The employee code must agree with the email's existing record.
 * - A row with no existing match creates an employee, unless its code is already in use.
 * - Duplicate emails or codes within the file reject every row involved, because the file is ambiguous.
 * - Salary history is append-only. A row dated after the current salary appends a record. A row that
 *   matches an existing record exactly is a no-op, which makes re-running an import safe. A row that
 *   conflicts with an existing record, or is dated before the current salary, is rejected.
 */
export function planEmployeeImport(
  rows: readonly { readonly line: number; readonly row: EmployeeImportRow }[],
  index: ExistingIndex,
): PlannedRow[] {
  const duplicateEmails = new Set(findDuplicateEmails(rows.map((r) => r.row.email)));
  const duplicateCodes = new Set(findDuplicateCodes(rows.map((r) => r.row.employeeCode)));

  return rows.map(({ line, row }) => {
    const reject = (errors: string[]): PlannedRow => ({
      line,
      email: row.email,
      outcome: "REJECTED",
      errors,
      action: null,
    });

    if (duplicateEmails.has(row.email)) {
      return reject([`email ${row.email} appears more than once in this file`]);
    }
    if (duplicateCodes.has(row.employeeCode)) {
      return reject([`employeeCode ${row.employeeCode} appears more than once in this file`]);
    }

    const byEmail = index.byEmail.get(row.email);
    const byCode = index.byCode.get(row.employeeCode);

    if (!byEmail) {
      if (byCode) {
        return reject([`employeeCode ${row.employeeCode} already belongs to a different email`]);
      }
      return {
        line,
        email: row.email,
        outcome: "CREATE",
        errors: [],
        action: { kind: "CREATE", row },
      };
    }

    if (byEmail.employeeCode !== row.employeeCode) {
      return reject([
        `email ${row.email} belongs to employee ${byEmail.employeeCode}, not ${row.employeeCode}`,
      ]);
    }

    const profile = profileChanges(byEmail, row);
    const salary = salaryChange(byEmail, row);
    if (salary.error) {
      return reject([salary.error]);
    }

    const changed = Object.keys(profile).length > 0 || salary.newSalary !== null;
    if (!changed) {
      return { line, email: row.email, outcome: "UNCHANGED", errors: [], action: null };
    }
    return {
      line,
      email: row.email,
      outcome: "UPDATE",
      errors: [],
      action: { kind: "UPDATE", employeeId: byEmail.id, profile, newSalary: salary.newSalary },
    };
  });
}

function profileChanges(existing: ExistingEmployee, row: EmployeeImportRow): ProfileChanges {
  const changes: ProfileChanges = {};
  if (row.firstName !== existing.firstName) changes.firstName = row.firstName;
  if (row.lastName !== existing.lastName) changes.lastName = row.lastName;
  if (row.jobTitle !== existing.jobTitle) changes.jobTitle = row.jobTitle;
  if (row.countryCode !== existing.countryCode) changes.countryCode = row.countryCode;
  if (row.departmentName !== existing.departmentName) changes.departmentName = row.departmentName;
  if (row.levelCode !== existing.levelCode) changes.levelCode = row.levelCode;
  if (row.status !== undefined && row.status !== existing.status) changes.status = row.status;
  return changes;
}

function salaryChange(
  existing: ExistingEmployee,
  row: EmployeeImportRow,
): { newSalary: ExistingSalary | null; error?: string } {
  const requested: ExistingSalary = {
    effectiveFrom: row.salaryEffectiveFrom,
    amountMinor: row.salaryAmount,
    currency: row.salaryCurrency,
  };

  const sameDate = existing.salaries.find((s) => s.effectiveFrom === row.salaryEffectiveFrom);
  if (sameDate) {
    if (
      sameDate.amountMinor === requested.amountMinor &&
      sameDate.currency === requested.currency
    ) {
      return { newSalary: null };
    }
    return {
      newSalary: null,
      error: `a salary dated ${row.salaryEffectiveFrom} is already recorded with a different amount or currency`,
    };
  }

  const latest = existing.salaries[0];
  if (!latest || row.salaryEffectiveFrom > latest.effectiveFrom) {
    return { newSalary: requested };
  }
  return {
    newSalary: null,
    error: `salaryEffectiveFrom ${row.salaryEffectiveFrom} is before the current salary (${latest.effectiveFrom}); salary history is not rewritten`,
  };
}

function findDuplicateCodes(codes: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const code of codes) {
    if (seen.has(code)) duplicates.add(code);
    seen.add(code);
  }
  return [...duplicates];
}
