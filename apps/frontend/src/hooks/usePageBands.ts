import type { EmployeeDto } from "@salary/shared";
import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { useAsync } from "./useAsync.js";

type BandPosition = "BELOW" | "ABOVE";

/** Band positions for the employees on screen only. */
export function usePageBands(employees: EmployeeDto[]): {
  bandFor: (employeeId: string) => BandPosition | undefined;
  loading: boolean;
} {
  const { api } = useAuth();
  const ids = employees.map((employee) => employee.id).join(",");
  const report = useAsync(
    (key: string) =>
      key === "" ? Promise.resolve(undefined) : api.bandViolations({ employeeIds: key.split(",") }),
    [ids],
  );
  const positions = useMemo(
    () => new Map((report.data?.items ?? []).map((item) => [item.employeeId, item.position])),
    [report.data],
  );
  return { bandFor: (employeeId) => positions.get(employeeId), loading: report.loading };
}
