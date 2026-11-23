import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { formatCsv, parseCsv } from "../domain/csv.js";
import {
  IMPORT_COLUMNS,
  mapCsvToRows,
  validateEmployeeRow,
  type EmployeeImportRow,
  type ImportReferenceData,
} from "../domain/employee-import.js";
import {
  planEmployeeImport,
  type ExistingEmployee,
  type ExistingIndex,
  type PlannedAction,
  type PlannedRow,
} from "../domain/employee-import-plan.js";
import { formatMoney, type MinorUnits } from "../domain/money.js";
import { HttpError } from "../http/errors.js";
import { employeeWhere, type EmployeeFilters } from "./employee-filters.js";

export interface ImportRowErrorDto {
  line: number;
  email: string;
  messages: string[];
}

export interface ImportReportDto {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  /** Every rejected row, in file order. Valid rows are applied even when others are rejected. */
  errors: ImportRowErrorDto[];
}

/** Database lookups are chunked so a 10,000-row import never sends one enormous IN list. */
const CHUNK_SIZE = 1000;

type EmployeeWithRefs = Prisma.EmployeeGetPayload<{
  include: { country: true; department: true; level: true };
}>;
const TRANSACTION_TIMEOUT_MS = 120_000;

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const fromDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const decimalToMinor = (value: Prisma.Decimal): MinorUnits => Math.round(value.toNumber() * 100);
const toDecimal = (minor: MinorUnits): Prisma.Decimal => new Prisma.Decimal(formatMoney(minor));

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function requireId(map: ReadonlyMap<string, number>, key: string): number {
  const id = map.get(key);
  if (id === undefined) {
    throw new Error(`reference "${key}" disappeared during import`);
  }
  return id;
}

export class BulkExchangeService {
  constructor(
    private readonly db: PrismaClient,
    private readonly clock: () => Date,
  ) {}

  /**
   * Imports employees from CSV text. Each row is validated, planned against the current data,
   * and then either reported (dry run) or applied. Valid rows are applied together in one
   * transaction, and rejected rows are reported with their line numbers.
   */
  async importEmployees(
    csvText: string,
    options: { dryRun: boolean },
    actor: string,
  ): Promise<ImportReportDto> {
    const table = parseCsv(csvText);
    if (!table.ok) {
      throw new HttpError(400, "MALFORMED_CSV", table.error);
    }
    const mapped = mapCsvToRows(table.value);
    if (!mapped.ok) {
      throw new HttpError(422, "INVALID_FILE", mapped.error.join("; "), mapped.error);
    }

    const reference = await this.loadReference();
    const valid: { line: number; row: EmployeeImportRow }[] = [];
    const rejected: ImportRowErrorDto[] = [];
    for (const { line, raw } of mapped.value) {
      const result = validateEmployeeRow(raw, reference);
      if (result.ok) {
        valid.push({ line, row: result.value });
      } else {
        rejected.push({
          line,
          email: (raw["email"] ?? "").trim().toLowerCase(),
          messages: result.error,
        });
      }
    }

    const existing = await this.loadExisting(valid.map((v) => v.row));
    const planned = planEmployeeImport(valid, existing.index);
    for (const row of planned) {
      if (row.outcome === "REJECTED") {
        rejected.push({ line: row.line, email: row.email, messages: [...row.errors] });
      }
    }

    if (!options.dryRun) {
      await this.apply(planned, existing.byId, actor);
    }

    const count = (outcome: PlannedRow["outcome"]): number =>
      planned.filter((row) => row.outcome === outcome).length;

    return {
      dryRun: options.dryRun,
      totalRows: mapped.value.length,
      created: count("CREATE"),
      updated: count("UPDATE"),
      unchanged: count("UNCHANGED"),
      rejected: rejected.length,
      errors: rejected.sort((a, b) => a.line - b.line),
    };
  }

  /** Exports employees matching the filters, in the same columns the import accepts. */
  async exportEmployeesCsv(filters: EmployeeFilters): Promise<string> {
    const rows = await this.db.employee.findMany({
      where: employeeWhere(filters),
      include: {
        country: true,
        department: true,
        level: true,
        salaryRecords: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
      orderBy: { employeeCode: "asc" },
    });

    const records = rows.map((row) => {
      const salary = row.salaryRecords[0];
      return [
        row.employeeCode,
        row.firstName,
        row.lastName,
        row.email,
        row.jobTitle,
        row.country.code,
        row.department.name,
        row.level.code,
        toDateOnly(row.startDate),
        row.status,
        salary ? salary.amount.toFixed(2) : "",
        salary?.currency ?? "",
        salary ? toDateOnly(salary.effectiveFrom) : "",
      ];
    });
    return formatCsv(IMPORT_COLUMNS, records);
  }

  private async loadReference(): Promise<ImportReferenceData> {
    const [countries, departments, levels] = await Promise.all([
      this.db.country.findMany(),
      this.db.department.findMany(),
      this.db.level.findMany(),
    ]);
    return {
      countryCodes: new Set(countries.map((c) => c.code)),
      departmentNames: new Set(departments.map((d) => d.name)),
      levelCodes: new Set(levels.map((l) => l.code)),
      today: toDateOnly(this.clock()),
    };
  }

  /** Loads every existing employee whose email or code appears in the file, with full salary history. */
  private async loadExisting(
    rows: readonly EmployeeImportRow[],
  ): Promise<{ index: ExistingIndex; byId: Map<string, ExistingEmployee> }> {
    const emails = [...new Set(rows.map((r) => r.email))];
    const codes = [...new Set(rows.map((r) => r.employeeCode))];

    const found = new Map<string, EmployeeWithRefs>();
    for (const chunk of chunks(emails, CHUNK_SIZE)) {
      const matches = await this.db.employee.findMany({
        where: { email: { in: chunk } },
        include: { country: true, department: true, level: true },
      });
      matches.forEach((m) => found.set(m.id, m));
    }
    for (const chunk of chunks(codes, CHUNK_SIZE)) {
      const matches = await this.db.employee.findMany({
        where: { employeeCode: { in: chunk } },
        include: { country: true, department: true, level: true },
      });
      matches.forEach((m) => found.set(m.id, m));
    }

    const ids = [...found.keys()];
    const salaryRows: Prisma.SalaryRecordGetPayload<object>[] = [];
    for (const chunk of chunks(ids, CHUNK_SIZE)) {
      salaryRows.push(
        ...(await this.db.salaryRecord.findMany({
          where: { employeeId: { in: chunk } },
          orderBy: { effectiveFrom: "desc" },
        })),
      );
    }
    const salariesById = new Map<string, ExistingEmployee["salaries"][number][]>();
    for (const record of salaryRows) {
      const list = salariesById.get(record.employeeId) ?? [];
      list.push({
        effectiveFrom: toDateOnly(record.effectiveFrom),
        amountMinor: decimalToMinor(record.amount),
        currency: record.currency,
      });
      salariesById.set(record.employeeId, list);
    }

    const byId = new Map<string, ExistingEmployee>();
    for (const m of found.values()) {
      byId.set(m.id, {
        id: m.id,
        employeeCode: m.employeeCode,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        jobTitle: m.jobTitle,
        countryCode: m.country.code,
        departmentName: m.department.name,
        levelCode: m.level.code,
        status: m.status,
        salaries: salariesById.get(m.id) ?? [],
      });
    }

    const all = [...byId.values()];
    return {
      byId,
      index: {
        byEmail: new Map(all.map((e) => [e.email, e])),
        byCode: new Map(all.map((e) => [e.employeeCode, e])),
      },
    };
  }

  /** Applies planned creates and updates in one transaction. All or nothing for the applied rows. */
  private async apply(
    planned: readonly PlannedRow[],
    existingById: ReadonlyMap<string, ExistingEmployee>,
    actor: string,
  ): Promise<void> {
    const actions = planned.flatMap((row) => (row.action ? [row.action] : []));
    if (actions.length === 0) {
      return;
    }

    await this.db.$transaction(
      async (tx) => {
        const countryIds = new Map(
          (await tx.country.findMany()).map((c) => [c.code, c.id] as const),
        );
        const departmentIds = new Map(
          (await tx.department.findMany()).map((d) => [d.name, d.id] as const),
        );
        const levelIds = new Map((await tx.level.findMany()).map((l) => [l.code, l.id] as const));

        for (const action of actions) {
          await this.applyAction(tx, action, existingById, actor, {
            countryIds,
            departmentIds,
            levelIds,
          });
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 20_000 },
    );
  }

  private async applyAction(
    tx: Prisma.TransactionClient,
    action: PlannedAction,
    existingById: ReadonlyMap<string, ExistingEmployee>,
    actor: string,
    refs: {
      countryIds: ReadonlyMap<string, number>;
      departmentIds: ReadonlyMap<string, number>;
      levelIds: ReadonlyMap<string, number>;
    },
  ): Promise<void> {
    if (action.kind === "CREATE") {
      const row = action.row;
      const employee = await tx.employee.create({
        data: {
          employeeCode: row.employeeCode,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          jobTitle: row.jobTitle,
          startDate: fromDateOnly(row.startDate),
          status: row.status ?? "ACTIVE",
          countryId: requireId(refs.countryIds, row.countryCode),
          departmentId: requireId(refs.departmentIds, row.departmentName),
          levelId: requireId(refs.levelIds, row.levelCode),
        },
      });
      await tx.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: toDecimal(row.salaryAmount),
          currency: row.salaryCurrency,
          effectiveFrom: fromDateOnly(row.salaryEffectiveFrom),
          createdBy: actor,
        },
      });
      await tx.auditLog.create({
        data: {
          employeeId: employee.id,
          action: "EMPLOYEE_CREATED",
          after: {
            employeeCode: row.employeeCode,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            jobTitle: row.jobTitle,
            countryCode: row.countryCode,
            departmentName: row.departmentName,
            levelCode: row.levelCode,
            status: row.status ?? "ACTIVE",
            salary: {
              amount: formatMoney(row.salaryAmount),
              currency: row.salaryCurrency,
              effectiveFrom: row.salaryEffectiveFrom,
            },
          },
          actor,
        },
      });
      return;
    }

    const existing = existingById.get(action.employeeId);
    if (!existing) {
      throw new Error(`employee ${action.employeeId} disappeared during import`);
    }
    const profile = action.profile;

    if (Object.keys(profile).length > 0) {
      await tx.employee.update({
        where: { id: existing.id },
        data: {
          ...(profile.firstName !== undefined ? { firstName: profile.firstName } : {}),
          ...(profile.lastName !== undefined ? { lastName: profile.lastName } : {}),
          ...(profile.jobTitle !== undefined ? { jobTitle: profile.jobTitle } : {}),
          ...(profile.countryCode !== undefined
            ? { countryId: requireId(refs.countryIds, profile.countryCode) }
            : {}),
          ...(profile.departmentName !== undefined
            ? { departmentId: requireId(refs.departmentIds, profile.departmentName) }
            : {}),
          ...(profile.levelCode !== undefined
            ? { levelId: requireId(refs.levelIds, profile.levelCode) }
            : {}),
          ...(profile.status !== undefined ? { status: profile.status } : {}),
        },
      });
      const before: Record<string, string> = {};
      const after: Record<string, string> = {};
      for (const [key, value] of Object.entries(profile)) {
        before[key] = existingValue(existing, key);
        after[key] = String(value);
      }
      await tx.auditLog.create({
        data: { employeeId: existing.id, action: "EMPLOYEE_UPDATED", before, after, actor },
      });
    }

    if (action.newSalary) {
      const salary = action.newSalary;
      await tx.salaryRecord.create({
        data: {
          employeeId: existing.id,
          amount: toDecimal(salary.amountMinor),
          currency: salary.currency,
          effectiveFrom: fromDateOnly(salary.effectiveFrom),
          createdBy: actor,
        },
      });
      const previous = existing.salaries[0];
      await tx.auditLog.create({
        data: {
          employeeId: existing.id,
          action: "SALARY_CHANGED",
          before: previous
            ? {
                amount: formatMoney(previous.amountMinor),
                currency: previous.currency,
                effectiveFrom: previous.effectiveFrom,
              }
            : Prisma.DbNull,
          after: {
            amount: formatMoney(salary.amountMinor),
            currency: salary.currency,
            effectiveFrom: salary.effectiveFrom,
          },
          actor,
        },
      });
    }
  }
}

/** The current value of one profile field, as it is stored before an import changes it. */
function existingValue(existing: ExistingEmployee, key: string): string {
  const values: Record<string, string> = {
    firstName: existing.firstName,
    lastName: existing.lastName,
    jobTitle: existing.jobTitle,
    countryCode: existing.countryCode,
    departmentName: existing.departmentName,
    levelCode: existing.levelCode,
    status: existing.status,
  };
  return values[key] ?? "";
}
