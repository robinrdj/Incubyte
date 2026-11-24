import { z } from "zod";
import { isIsoDate } from "../domain/employee-import.js";
import { parseMoney } from "../domain/money.js";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date in YYYY-MM-DD form")
  .refine(isIsoDate, "must be a real calendar date");

const moneyAmount = z
  .string()
  .refine((value) => parseMoney(value).ok, "must be a positive amount with up to two decimals");

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "must be a three-letter ISO currency code");

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "must be a two-letter ISO country code");

const levelCode = z.string().trim().toUpperCase().min(1, "is required");
const departmentName = z.string().trim().min(1, "is required").max(100);
const personName = z.string().trim().min(1, "is required").max(100);

const email = z.string().trim().toLowerCase().pipe(z.email("must be a valid email address"));

export const employeeStatusSchema = z.enum(["ACTIVE", "LEAVING"]);

export const salaryInputSchema = z.object({
  amount: moneyAmount,
  currency: currencyCode,
  effectiveFrom: isoDate,
});

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "must be 3 to 20 letters, digits, or hyphens"),
  firstName: personName,
  lastName: personName,
  email,
  jobTitle: z.string().trim().min(1, "is required").max(150),
  countryCode,
  departmentName,
  levelCode,
  startDate: isoDate,
  salary: salaryInputSchema,
});

/** Partial profile update. At least one field must be present. */
export const updateEmployeeSchema = z
  .object({
    firstName: personName,
    lastName: personName,
    email,
    jobTitle: z.string().trim().min(1, "is required").max(150),
    countryCode,
    departmentName,
    levelCode,
    status: employeeStatusSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "at least one field must be provided");

export const salaryChangeSchema = salaryInputSchema;

export const employeeFilterSchema = z.object({
  search: z.string().trim().max(100).optional(),
  countryCode: countryCode.optional(),
  departmentName: departmentName.optional(),
  levelCode: levelCode.optional(),
  status: employeeStatusSchema.optional(),
});

export const listEmployeesQuerySchema = employeeFilterSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const employeeIdSchema = z.uuid("must be a valid id");

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type SalaryInput = z.infer<typeof salaryInputSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

const asOfDate = isoDate.optional();

export const compensationQuerySchema = z.object({
  groupBy: z.enum(["country", "department", "level"]).default("country"),
  asOf: asOfDate,
});

export const MAX_BAND_PAGE_SIZE = 100;

export const bandViolationsQuerySchema = z.object({
  asOf: asOfDate,
  /** Comma-separated employee ids. */
  employeeIds: z
    .string()
    .optional()
    .transform((value) =>
      value === undefined
        ? undefined
        : value
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id !== ""),
    )
    .pipe(z.array(z.uuid("must be valid ids")).max(MAX_BAND_PAGE_SIZE).optional()),
  position: z.enum(["BELOW", "ABOVE"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_BAND_PAGE_SIZE).optional(),
});

export type BandViolationsQuery = z.infer<typeof bandViolationsQuerySchema>;

export type CompensationQuery = z.infer<typeof compensationQuerySchema>;

/** Matches the DECIMAL(18,8) rate column. */
const fxRateValue = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,8})?$/, "must be a positive number with up to 8 decimal places")
  .refine((value) => Number(value) > 0, "must be greater than zero");

export const saveFxRateSchema = z.object({
  currency: currencyCode,
  rate: fxRateValue,
  rateDate: isoDate,
});

export const payBandKeySchema = z.object({
  countryCode,
  levelCode,
});

export const savePayBandSchema = z.object({
  minAmount: moneyAmount,
  maxAmount: moneyAmount,
});

export type SaveFxRateInput = z.infer<typeof saveFxRateSchema>;
export type SavePayBandInput = z.infer<typeof savePayBandSchema>;

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "is required"),
  password: z.string().min(1, "is required"),
});

export const createHrUserSchema = z.object({
  name: personName,
  email,
  password: z.string().min(12, "must be at least 12 characters").max(200),
});

export type CreateHrUserInput = z.infer<typeof createHrUserSchema>;
