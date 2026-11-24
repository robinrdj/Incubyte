/** Shared, so the downloadable template and the import cannot diverge. */
export const EMPLOYEE_CSV_COLUMNS = [
  "employeeCode",
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "countryCode",
  "departmentName",
  "levelCode",
  "startDate",
  "status",
  "salaryAmount",
  "salaryCurrency",
  "salaryEffectiveFrom",
] as const;
