/** Column order for the employee CSV import and export. Shared so the template and the API cannot diverge. */
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
