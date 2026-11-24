import type { EmployeeDto, UpdateEmployeeRequest } from "@salary/shared";
import {
  valuesFromEmployee,
  type EmployeeFormValues,
} from "../components/employee/EmployeeForm.js";

/** Only the fields that changed, so a save never rewrites data the user did not touch. */
export function profilePatch(
  employee: EmployeeDto,
  values: EmployeeFormValues,
): UpdateEmployeeRequest {
  const original = valuesFromEmployee(employee);
  const patch: UpdateEmployeeRequest = {};
  if (values.firstName !== original.firstName) patch.firstName = values.firstName.trim();
  if (values.lastName !== original.lastName) patch.lastName = values.lastName.trim();
  if (values.email !== original.email) patch.email = values.email.trim().toLowerCase();
  if (values.jobTitle !== original.jobTitle) patch.jobTitle = values.jobTitle.trim();
  if (values.countryCode !== original.countryCode) patch.countryCode = values.countryCode;
  if (values.departmentName !== original.departmentName) {
    patch.departmentName = values.departmentName;
  }
  if (values.levelCode !== original.levelCode) patch.levelCode = values.levelCode;
  if (values.status !== original.status) patch.status = values.status;
  return patch;
}
