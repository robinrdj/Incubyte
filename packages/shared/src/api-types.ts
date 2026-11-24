/**
 * The HTTP contract between the API and the web app. Both sides import these types, so a change
 * to a response shape is a compile error in the web app rather than a runtime surprise.
 * Amounts are decimal strings with two places, never numbers, so money is not rounded by JavaScript.
 */

export type EmploymentStatus = "ACTIVE" | "LEAVING";

export type GroupBy = "country" | "department" | "level";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// A type alias, not an interface, so it can be stored as a JSON audit snapshot.
export type SalaryDto = {
  amount: string;
  currency: string;
  effectiveFrom: string;
};

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
  status: EmploymentStatus;
  country: { code: string; name: string };
  department: { name: string };
  level: { code: string; rank: number };
  currentSalary: SalaryDto | null;
}

export interface AuditEventDto {
  id: string;
  action: "EMPLOYEE_CREATED" | "EMPLOYEE_UPDATED" | "SALARY_CHANGED";
  /** Snapshot of the fields before the change, as stored. Null when there was nothing before. */
  before: unknown;
  /** Snapshot of the fields after the change, as stored. */
  after: unknown;
  actor: string;
  createdAt: string;
}

export interface CreateEmployeeRequest {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  countryCode: string;
  departmentName: string;
  levelCode: string;
  startDate: string;
  salary: SalaryChangeRequest;
}

/** Partial profile update. Send only the fields that change. */
export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  countryCode?: string;
  departmentName?: string;
  levelCode?: string;
  status?: EmploymentStatus;
}

export interface SalaryChangeRequest {
  amount: string;
  currency: string;
  effectiveFrom: string;
}

export interface SummaryDto {
  headcount: number;
  medianUsd: string | null;
  averageUsd: string | null;
  minUsd: string | null;
  maxUsd: string | null;
}

export interface CompensationReportDto {
  asOf: string;
  currency: string;
  groupBy: GroupBy;
  overall: SummaryDto;
  excludedWithoutSalary: number;
  groups: Array<{ key: string; label: string; summary: SummaryDto }>;
}

export interface BandViolationDto {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  departmentName: string;
  levelCode: string;
  salary: { amount: string; currency: string; usd: string };
  band: { minUsd: string; maxUsd: string };
  position: "BELOW" | "ABOVE";
  compaRatio: number;
}

export interface BandViolationReportDto {
  asOf: string;
  currency: string;
  evaluated: number;
  withoutBand: number;
  items: BandViolationDto[];
}

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
  errors: ImportRowErrorDto[];
}

/** Error body returned for every failure: { error: { code, message, details? } }. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Picker options for the employee forms. */
export interface ReferenceDataDto {
  countries: Array<{ code: string; name: string; currency: string }>;
  departments: Array<{ name: string }>;
  levels: Array<{ code: string; rank: number }>;
}

/** One dated exchange rate: 1 unit of `currency` is worth `rate` units of the reporting currency. */
export interface FxRateDto {
  currency: string;
  /** Decimal string with up to 8 places, for example "1.08500000". */
  rate: string;
  rateDate: string;
}

export interface FxRateListDto {
  reportingCurrency: string;
  /** Every stored rate, newest first within each currency. */
  items: FxRateDto[];
}

/** Adds the rate for a currency on a date, or corrects the rate already stored for that date. */
export interface SaveFxRateRequest {
  currency: string;
  rate: string;
  rateDate: string;
}

/** Salary range for one level in one country, in the country's currency. */
export interface PayBandDto {
  countryCode: string;
  levelCode: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
}

export interface SavePayBandRequest {
  minAmount: string;
  maxAmount: string;
}
