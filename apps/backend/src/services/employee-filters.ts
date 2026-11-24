import type { Prisma } from "../generated/prisma/client.js";

/** Filters shared by the employee list and the CSV export, so both return the same people. */
export interface EmployeeFilters {
  readonly search?: string | undefined;
  readonly countryCode?: string | undefined;
  readonly departmentName?: string | undefined;
  readonly levelCode?: string | undefined;
  readonly status?: "ACTIVE" | "LEAVING" | undefined;
}

export function employeeWhere(filters: EmployeeFilters): Prisma.EmployeeWhereInput {
  const { search, countryCode, departmentName, levelCode, status } = filters;
  return {
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { employeeCode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(countryCode ? { country: { code: countryCode } } : {}),
    ...(departmentName ? { department: { name: departmentName } } : {}),
    ...(levelCode ? { level: { code: levelCode } } : {}),
    ...(status ? { status } : {}),
  };
}
