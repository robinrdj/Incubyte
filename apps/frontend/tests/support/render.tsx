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
import { AuthProvider } from "../../src/auth/AuthContext.js";

export const TEST_USER = {
  id: "99999999-9999-4999-8999-999999999999",
  name: "Test HR",
  email: "hr.manager@acme.test",
  createdAt: "2026-11-01T09:00:00.000Z",
  createdBy: null,
};

/** Starts the test signed in, by storing a session the same way a real sign-in does. */
export function signedIn(): void {
  window.sessionStorage.setItem(
    "salary.session",
    JSON.stringify({ token: "test-session-token", user: TEST_USER }),
  );
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
  const below = items.filter((item) => item.position === "BELOW").length;
  return {
    asOf: "2026-11-23",
    currency: "USD",
    evaluated: Math.max(1, items.length),
    withoutBand: 0,
    below,
    above: items.length - below,
    total: items.length,
    page: 1,
    pageSize: Math.max(1, items.length),
    items,
  };
}
