import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { latestToday } from "../domain/dates.js";
import { formatMoney, parseMoney } from "../domain/money.js";
import { conflict, notFound, unprocessable } from "../http/errors.js";
import { employeeWhere } from "./employee-filters.js";
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  SalaryInput,
  UpdateEmployeeInput,
} from "../http/schemas.js";
import type {
  AuditEventDto,
  EmployeeDto,
  EmployeeListDto,
  ReferenceDataDto,
  SalaryDto,
} from "@salary/shared";

type Tx = Prisma.TransactionClient;

const employeeInclude = {
  country: true,
  department: true,
  level: true,
  salaryRecords: { orderBy: { effectiveFrom: "desc" }, take: 1 },
} satisfies Prisma.EmployeeInclude;

type EmployeeRow = Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>;

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const fromDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

/** Converts a validated amount string to minor units. Callers have already validated it. */
function amountToMinor(amount: string): number {
  const parsed = parseMoney(amount);
  if (!parsed.ok) {
    throw unprocessable(parsed.error);
  }
  return parsed.value;
}

function toDecimal(amount: string): Prisma.Decimal {
  return new Prisma.Decimal(formatMoney(amountToMinor(amount)));
}

function toSalaryDto(record: {
  amount: Prisma.Decimal;
  currency: string;
  effectiveFrom: Date;
}): SalaryDto {
  return {
    amount: record.amount.toFixed(2),
    currency: record.currency,
    effectiveFrom: toDateOnly(record.effectiveFrom),
  };
}

function toEmployeeDto(row: EmployeeRow): EmployeeDto {
  const current = row.salaryRecords[0];
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    jobTitle: row.jobTitle,
    startDate: toDateOnly(row.startDate),
    status: row.status,
    country: { code: row.country.code, name: row.country.name },
    department: { name: row.department.name },
    level: { code: row.level.code, rank: row.level.rank },
    currentSalary: current ? toSalaryDto(current) : null,
  };
}

/** The business-visible profile fields, with references as readable codes (not internal ids). */
function profileSnapshot(row: EmployeeRow): Record<string, string> {
  return {
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    jobTitle: row.jobTitle,
    countryCode: row.country.code,
    departmentName: row.department.name,
    levelCode: row.level.code,
    status: row.status,
  };
}

export class EmployeeService {
  constructor(
    private readonly db: PrismaClient,
    private readonly clock: () => Date,
  ) {}

  private today(): string {
    return latestToday(this.clock());
  }

  async list(query: ListEmployeesQuery): Promise<EmployeeListDto> {
    const where = employeeWhere(query);
    const withoutStatus = employeeWhere({ ...query, status: undefined });

    // Reads run outside a transaction. Prisma's adapter fires relation loads concurrently inside a
    // transaction, which triggers a pg driver deprecation warning.
    const [total, byStatus] = await Promise.all([
      this.db.employee.count({ where }),
      this.db.employee.groupBy({ by: ["status"], where: withoutStatus, _count: { _all: true } }),
    ]);
    const rows = await this.db.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      items: rows.map(toEmployeeDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
      statusCounts: {
        ACTIVE: byStatus.find((row) => row.status === "ACTIVE")?._count._all ?? 0,
        LEAVING: byStatus.find((row) => row.status === "LEAVING")?._count._all ?? 0,
      },
    };
  }

  async get(id: string): Promise<EmployeeDto> {
    const row = await this.db.employee.findUnique({ where: { id }, include: employeeInclude });
    if (!row) {
      throw notFound("Employee");
    }
    return toEmployeeDto(row);
  }

  async create(input: CreateEmployeeInput, actor: string): Promise<EmployeeDto> {
    return this.db.$transaction(async (tx) => {
      await this.assertUnique(tx, { email: input.email, employeeCode: input.employeeCode });

      if (input.salary.effectiveFrom < input.startDate) {
        throw unprocessable("salary effectiveFrom cannot be before startDate");
      }
      this.assertNotFuture(input.salary.effectiveFrom, "salary effectiveFrom");

      const employee = await tx.employee.create({
        data: {
          employeeCode: input.employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          jobTitle: input.jobTitle,
          startDate: fromDateOnly(input.startDate),
          countryId: await this.findCountryId(tx, input.countryCode),
          departmentId: await this.findDepartmentId(tx, input.departmentName),
          levelId: await this.findLevelId(tx, input.levelCode),
        },
      });

      const salary = await tx.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: toDecimal(input.salary.amount),
          currency: input.salary.currency,
          effectiveFrom: fromDateOnly(input.salary.effectiveFrom),
          createdBy: actor,
        },
      });

      const loaded = await this.load(tx, employee.id);
      await tx.auditLog.create({
        data: {
          employeeId: employee.id,
          action: "EMPLOYEE_CREATED",
          after: {
            ...profileSnapshot(loaded),
            salary: toSalaryDto(salary),
          },
          actor,
        },
      });

      return toEmployeeDto(loaded);
    });
  }

  /** Updates profile fields. Writes an audit event listing only the fields that actually changed. */
  async update(id: string, patch: UpdateEmployeeInput, actor: string): Promise<EmployeeDto> {
    return this.db.$transaction(async (tx) => {
      const existing = await this.load(tx, id);
      if (patch.email !== undefined && patch.email !== existing.email) {
        await this.assertUnique(tx, { email: patch.email, excludeId: id });
      }

      const countryId =
        patch.countryCode !== undefined
          ? await this.findCountryId(tx, patch.countryCode)
          : undefined;
      const departmentId =
        patch.departmentName !== undefined
          ? await this.findDepartmentId(tx, patch.departmentName)
          : undefined;
      const levelId =
        patch.levelCode !== undefined ? await this.findLevelId(tx, patch.levelCode) : undefined;

      const before = profileSnapshot(existing);
      const merged: Record<string, string> = {
        ...before,
        ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
        ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle } : {}),
        ...(patch.countryCode !== undefined ? { countryCode: patch.countryCode } : {}),
        ...(patch.departmentName !== undefined ? { departmentName: patch.departmentName } : {}),
        ...(patch.levelCode !== undefined ? { levelCode: patch.levelCode } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      };

      const changedKeys = Object.keys(merged).filter((key) => merged[key] !== before[key]);
      if (changedKeys.length === 0) {
        return toEmployeeDto(existing);
      }

      await tx.employee.update({
        where: { id },
        data: {
          ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
          ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle } : {}),
          ...(countryId !== undefined ? { countryId } : {}),
          ...(departmentId !== undefined ? { departmentId } : {}),
          ...(levelId !== undefined ? { levelId } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          employeeId: id,
          action: "EMPLOYEE_UPDATED",
          before: Object.fromEntries(changedKeys.map((key) => [key, before[key]])),
          after: Object.fromEntries(changedKeys.map((key) => [key, merged[key]])),
          actor,
        },
      });

      return toEmployeeDto(await this.load(tx, id));
    });
  }

  /**
   * Records a salary. A later date adds a record, so the history grows. The current record's own
   * date corrects that record instead, for example when a salary was entered wrongly; the audit
   * trail keeps both values. Earlier dates are refused: the past is only changed through its
   * latest record.
   */
  async addSalaryChange(id: string, input: SalaryInput, actor: string): Promise<SalaryDto> {
    return this.db.$transaction(async (tx) => {
      const employee = await this.load(tx, id);
      this.assertNotFuture(input.effectiveFrom, "salary effectiveFrom");

      const current = employee.salaryRecords[0];
      const currentDate = current ? toDateOnly(current.effectiveFrom) : null;
      if (currentDate !== null && input.effectiveFrom < currentDate) {
        throw unprocessable(
          `salary effectiveFrom must be on or after the current salary's date (${currentDate})`,
        );
      }

      const correcting = current !== undefined && input.effectiveFrom === currentDate;
      if (
        correcting &&
        current.amount.equals(toDecimal(input.amount)) &&
        current.currency === input.currency
      ) {
        return toSalaryDto(current);
      }

      const record = correcting
        ? await tx.salaryRecord.update({
            where: { id: current.id },
            data: { amount: toDecimal(input.amount), currency: input.currency },
          })
        : await tx.salaryRecord.create({
            data: {
              employeeId: id,
              amount: toDecimal(input.amount),
              currency: input.currency,
              effectiveFrom: fromDateOnly(input.effectiveFrom),
              createdBy: actor,
            },
          });

      await tx.auditLog.create({
        data: {
          employeeId: id,
          action: "SALARY_CHANGED",
          before: current ? toSalaryDto(current) : Prisma.DbNull,
          after: toSalaryDto(record),
          actor,
        },
      });

      return toSalaryDto(record);
    });
  }

  async salaryHistory(id: string): Promise<SalaryDto[]> {
    await this.ensureExists(id);
    const records = await this.db.salaryRecord.findMany({
      where: { employeeId: id },
      orderBy: { effectiveFrom: "asc" },
    });
    return records.map(toSalaryDto);
  }

  async auditTrail(id: string): Promise<AuditEventDto[]> {
    await this.ensureExists(id);
    const events = await this.db.auditLog.findMany({
      where: { employeeId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      before: event.before,
      after: event.after,
      actor: event.actor,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  /** Countries, departments, and levels for pickers. Read-only. */
  async reference(): Promise<ReferenceDataDto> {
    const [countries, departments, levels] = await Promise.all([
      this.db.country.findMany({ orderBy: { name: "asc" } }),
      this.db.department.findMany({ orderBy: { name: "asc" } }),
      this.db.level.findMany({ orderBy: { rank: "asc" } }),
    ]);
    return {
      countries: countries.map((c) => ({ code: c.code, name: c.name, currency: c.currency })),
      departments: departments.map((d) => ({ name: d.name })),
      levels: levels.map((l) => ({ code: l.code, rank: l.rank })),
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.db.employee.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw notFound("Employee");
    }
  }

  /**
   * Loads an employee inside a transaction. Queries run one at a time: an `include` inside a
   * transaction makes Prisma's adapter issue concurrent queries, which pg flags as deprecated.
   */
  private async load(tx: Tx, id: string): Promise<EmployeeRow> {
    const employee = await tx.employee.findUnique({ where: { id } });
    if (!employee) {
      throw notFound("Employee");
    }
    const country = await tx.country.findUniqueOrThrow({ where: { id: employee.countryId } });
    const department = await tx.department.findUniqueOrThrow({
      where: { id: employee.departmentId },
    });
    const level = await tx.level.findUniqueOrThrow({ where: { id: employee.levelId } });
    const latestSalary = await tx.salaryRecord.findFirst({
      where: { employeeId: id },
      orderBy: { effectiveFrom: "desc" },
    });
    return {
      ...employee,
      country,
      department,
      level,
      salaryRecords: latestSalary ? [latestSalary] : [],
    };
  }

  private assertNotFuture(date: string, field: string): void {
    if (date > this.today()) {
      throw unprocessable(`${field} cannot be in the future`);
    }
  }

  private async assertUnique(
    tx: Tx,
    check: { email?: string; employeeCode?: string; excludeId?: string },
  ): Promise<void> {
    const clash = await tx.employee.findFirst({
      where: {
        OR: [
          ...(check.email !== undefined ? [{ email: check.email }] : []),
          ...(check.employeeCode !== undefined ? [{ employeeCode: check.employeeCode }] : []),
        ],
        ...(check.excludeId !== undefined ? { NOT: { id: check.excludeId } } : {}),
      },
      select: { email: true, employeeCode: true },
    });
    if (!clash) {
      return;
    }
    if (check.email !== undefined && clash.email === check.email) {
      throw conflict("An employee with this email already exists");
    }
    throw conflict("An employee with this employee code already exists");
  }

  // Reference lookups: unknown codes are rejected, never created on the fly.

  private async findCountryId(tx: Tx, code: string): Promise<number> {
    const country = await tx.country.findUnique({ where: { code } });
    if (!country) {
      throw unprocessable(`countryCode "${code}" is not a known country`);
    }
    return country.id;
  }

  private async findDepartmentId(tx: Tx, name: string): Promise<number> {
    const department = await tx.department.findUnique({ where: { name } });
    if (!department) {
      throw unprocessable(`departmentName "${name}" is not a known department`);
    }
    return department.id;
  }

  private async findLevelId(tx: Tx, code: string): Promise<number> {
    const level = await tx.level.findUnique({ where: { code } });
    if (!level) {
      throw unprocessable(`levelCode "${code}" is not a known level`);
    }
    return level.id;
  }
}
