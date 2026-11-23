import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import {
  groupItems,
  summarizeCompensation,
  type CompensationSummary,
} from "../domain/compensation.js";
import { REPORTING_CURRENCY, toReportingCurrency, type FxRates } from "../domain/fx.js";
import { compaRatio, bandPosition } from "../domain/pay-band.js";
import { formatMoney, type MinorUnits } from "../domain/money.js";
import { unprocessable } from "../http/errors.js";
import type {
  GroupBy,
  SummaryDto,
  CompensationReportDto,
  BandViolationDto,
  BandViolationReportDto,
} from "@salary/shared";

const employeeInclude = {
  country: true,
  department: true,
  level: true,
} satisfies Prisma.EmployeeInclude;

const payBandInclude = {
  level: true,
  country: true,
} satisfies Prisma.PayBandInclude;

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const fromDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

/** Converts a DECIMAL(14,2) value to integer minor units. */
const decimalToMinor = (value: Prisma.Decimal): MinorUnits => Math.round(value.toNumber() * 100);

function toSummaryDto(summary: CompensationSummary): SummaryDto {
  const money = (value: MinorUnits | null): string | null =>
    value === null ? null : formatMoney(value);
  return {
    headcount: summary.headcount,
    medianUsd: money(summary.medianMinor),
    averageUsd: money(summary.averageMinor),
    minUsd: money(summary.minMinor),
    maxUsd: money(summary.maxMinor),
  };
}

/** One active employee's current salary, converted to USD, with the labels needed for grouping. */
interface SalaryPoint {
  readonly employeeId: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly countryId: number;
  readonly countryCode: string;
  readonly countryName: string;
  readonly departmentName: string;
  readonly levelId: number;
  readonly levelCode: string;
  readonly amount: string;
  readonly currency: string;
  readonly usd: MinorUnits;
}

export class AnalyticsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly clock: () => Date,
  ) {}

  /** Headcount and pay statistics in USD, grouped by country, department, or level. */
  async compensation(groupBy: GroupBy, asOf?: string): Promise<CompensationReportDto> {
    const date = asOf ?? toDateOnly(this.clock());
    const { points, excludedWithoutSalary } = await this.currentSalaries(date);

    const classify = (point: SalaryPoint): { key: string; label: string } => {
      switch (groupBy) {
        case "country":
          return { key: String(point.countryId), label: point.countryName };
        case "department":
          return { key: point.departmentName, label: point.departmentName };
        case "level":
          return { key: String(point.levelId), label: point.levelCode };
      }
    };

    const groups = groupItems(points, classify).map((group) => ({
      key: group.key,
      label: group.label,
      summary: toSummaryDto(summarizeCompensation(group.items.map((p) => p.usd))),
    }));

    return {
      asOf: date,
      currency: REPORTING_CURRENCY,
      groupBy,
      overall: toSummaryDto(summarizeCompensation(points.map((p) => p.usd))),
      excludedWithoutSalary,
      groups,
    };
  }

  /** Active employees whose salary is below or above their level and country pay band. */
  async bandViolations(asOf?: string): Promise<BandViolationReportDto> {
    const date = asOf ?? toDateOnly(this.clock());
    const [{ points }, bands, rates] = await Promise.all([
      this.currentSalaries(date),
      this.db.payBand.findMany({ include: payBandInclude }),
      this.loadRates(date),
    ]);

    const bandRows = bands.map((band) => {
      const minUsd = toReportingCurrency(decimalToMinor(band.minAmount), band.currency, rates);
      const maxUsd = toReportingCurrency(decimalToMinor(band.maxAmount), band.currency, rates);
      return { band, minUsd, maxUsd };
    });
    const bandsByLevelAndCountry = new Map(
      bandRows.map((row) => [`${String(row.band.levelId)}:${String(row.band.countryId)}`, row]),
    );

    let evaluated = 0;
    let withoutBand = 0;
    const items: BandViolationDto[] = [];

    for (const point of points) {
      const match = bandsByLevelAndCountry.get(
        `${String(point.levelId)}:${String(point.countryId)}`,
      );
      if (!match) {
        withoutBand += 1;
        continue;
      }
      evaluated += 1;

      const band = { minMinor: match.minUsd, maxMinor: match.maxUsd };
      const position = bandPosition(point.usd, band);
      if (position === "WITHIN") {
        continue;
      }
      items.push({
        employeeId: point.employeeId,
        employeeCode: point.employeeCode,
        firstName: point.firstName,
        lastName: point.lastName,
        countryCode: point.countryCode,
        departmentName: point.departmentName,
        levelCode: point.levelCode,
        salary: { amount: point.amount, currency: point.currency, usd: formatMoney(point.usd) },
        band: { minUsd: formatMoney(match.minUsd), maxUsd: formatMoney(match.maxUsd) },
        position,
        compaRatio: Math.round(compaRatio(point.usd, band) * 100) / 100,
      });
    }

    items.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
    return { asOf: date, currency: REPORTING_CURRENCY, evaluated, withoutBand, items };
  }

  /**
   * Current salary of each active employee on the given date, converted to USD.
   * Throws 422 listing every currency that lacks a rate, rather than dropping those employees.
   */
  private async currentSalaries(
    asOf: string,
  ): Promise<{ points: SalaryPoint[]; excludedWithoutSalary: number }> {
    const [employees, rates] = await Promise.all([
      this.db.employee.findMany({
        where: { status: "ACTIVE" },
        include: {
          ...employeeInclude,
          salaryRecords: {
            where: { effectiveFrom: { lte: fromDateOnly(asOf) } },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      }),
      this.loadRates(asOf),
    ]);

    const withSalary = employees.filter((employee) => employee.salaryRecords.length > 0);
    const missing = [
      ...new Set(
        withSalary
          .map((employee) => employee.salaryRecords[0]?.currency ?? "")
          .filter((currency) => currency !== REPORTING_CURRENCY && !rates.has(currency)),
      ),
    ].sort();
    if (missing.length > 0) {
      throw unprocessable(
        `No FX rate on or before ${asOf} for ${missing.join(", ")}. Add the rates before running analytics.`,
      );
    }

    const points = withSalary.map((employee): SalaryPoint => {
      const salary = employee.salaryRecords[0];
      if (!salary) {
        throw new Error("unreachable: employees without salaries were filtered out");
      }
      const minor = decimalToMinor(salary.amount);
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        countryId: employee.country.id,
        countryCode: employee.country.code,
        countryName: employee.country.name,
        departmentName: employee.department.name,
        levelId: employee.level.id,
        levelCode: employee.level.code,
        amount: salary.amount.toFixed(2),
        currency: salary.currency,
        usd: toReportingCurrency(minor, salary.currency, rates),
      };
    });

    return { points, excludedWithoutSalary: employees.length - withSalary.length };
  }

  /** Latest rate for each currency on or before the date, to USD. */
  private async loadRates(asOf: string): Promise<FxRates> {
    const rows = await this.db.fxRate.findMany({
      where: { toCurrency: REPORTING_CURRENCY, rateDate: { lte: fromDateOnly(asOf) } },
      orderBy: { rateDate: "desc" },
    });
    const rates = new Map<string, number>();
    for (const row of rows) {
      if (!rates.has(row.fromCurrency)) {
        rates.set(row.fromCurrency, row.rate.toNumber());
      }
    }
    return rates;
  }
}
