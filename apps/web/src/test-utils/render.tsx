import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import type {
  BandViolationReportDto,
  EmployeeDto,
  ReferenceDataDto,
  SalaryDto,
} from "@salary/shared";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../auth/AuthContext.js";
import { toBase64 } from "../api/client.js";

export const TEST_PASSWORD = "correct-horse-battery";

/** Starts the test signed in, by writing the session the same way a real sign-in does. */
export function signedIn(): void {
  window.sessionStorage.setItem("salary.session", toBase64(`hr:${TEST_PASSWORD}`));
}

/** Renders children inside the same providers the app uses, at the given address. */
export function renderAt(path: string, children: ReactNode) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

export const REFERENCE: ReferenceDataDto = {
  countries: [
    { code: "DE", name: "Germany", currency: "EUR" },
    { code: "IN", name: "India", currency: "INR" },
  ],
  departments: [{ name: "Engineering" }, { name: "Finance" }],
  levels: [
    { code: "L1", rank: 1 },
    { code: "L2", rank: 2 },
    { code: "L3", rank: 3 },
  ],
};

export function employee(overrides: Partial<EmployeeDto> = {}): EmployeeDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    employeeCode: "EMP-000001",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@acme.test",
    jobTitle: "Engineer",
    startDate: "2024-01-15",
    status: "ACTIVE",
    country: { code: "DE", name: "Germany" },
    department: { name: "Engineering" },
    level: { code: "L3", rank: 3 },
    currentSalary: { amount: "96000.00", currency: "EUR", effectiveFrom: "2025-01-15" },
    ...overrides,
  };
}

export const SALARY_HISTORY: SalaryDto[] = [
  { amount: "90000.00", currency: "EUR", effectiveFrom: "2024-01-15" },
  { amount: "96000.00", currency: "EUR", effectiveFrom: "2025-01-15" },
];

export function bandReport(items: BandViolationReportDto["items"] = []): BandViolationReportDto {
  return { asOf: "2026-11-23", currency: "USD", evaluated: 1, withoutBand: 0, items };
}
