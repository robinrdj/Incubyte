import { Alert, Button, Group, Select, SimpleGrid, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { EmployeeDto, ReferenceDataDto } from "@salary/shared";
import { useEffect } from "react";

export interface EmployeeFormValues {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  countryCode: string;
  departmentName: string;
  levelCode: string;
  startDate: string;
  status: "ACTIVE" | "LEAVING";
  salaryAmount: string;
  salaryCurrency: string;
  salaryEffectiveFrom: string;
}

const EMPTY_VALUES: EmployeeFormValues = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  countryCode: "",
  departmentName: "",
  levelCode: "",
  startDate: "",
  status: "ACTIVE",
  salaryAmount: "",
  salaryCurrency: "",
  salaryEffectiveFrom: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AMOUNT = /^\d+(\.\d{1,2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Initial values for editing an existing employee. Salary fields are not edited here. */
export function valuesFromEmployee(employee: EmployeeDto): EmployeeFormValues {
  return {
    ...EMPTY_VALUES,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    countryCode: employee.country.code,
    departmentName: employee.department.name,
    levelCode: employee.level.code,
    startDate: employee.startDate,
    status: employee.status,
  };
}

interface EmployeeFormProps {
  mode: "create" | "edit";
  reference: ReferenceDataDto;
  initialValues?: EmployeeFormValues;
  saving: boolean;
  serverError: string | null;
  submitLabel: string;
  onSubmit: (values: EmployeeFormValues) => void;
  onCancel?: () => void;
}

/**
 * Profile form for creating or editing an employee. Create mode also captures the opening salary.
 * Validation here mirrors the API, so most mistakes are caught before a request is sent.
 */
export function EmployeeForm({
  mode,
  reference,
  initialValues,
  saving,
  serverError,
  submitLabel,
  onSubmit,
  onCancel,
}: EmployeeFormProps): React.JSX.Element {
  const form = useForm<EmployeeFormValues>({
    mode: "controlled",
    initialValues: initialValues ?? EMPTY_VALUES,
    validate: {
      employeeCode: (value) =>
        mode === "create" && !/^[A-Za-z0-9-]{3,20}$/.test(value.trim())
          ? "Use 3 to 20 letters, digits, or hyphens"
          : null,
      firstName: (value) => (value.trim() === "" ? "Required" : null),
      lastName: (value) => (value.trim() === "" ? "Required" : null),
      email: (value) => (EMAIL.test(value.trim()) ? null : "Enter a valid email address"),
      jobTitle: (value) => (value.trim() === "" ? "Required" : null),
      countryCode: (value) => (value === "" ? "Choose a country" : null),
      departmentName: (value) => (value === "" ? "Choose a department" : null),
      levelCode: (value) => (value === "" ? "Choose a level" : null),
      startDate: (value) => (DATE.test(value) ? null : "Enter a start date"),
      ...(mode === "create"
        ? {
            salaryAmount: (value: string) =>
              AMOUNT.test(value.trim()) && Number(value) > 0
                ? null
                : "Enter an amount such as 90000.00 (up to two decimals)",
            salaryCurrency: (value: string) => (value === "" ? "Choose a currency" : null),
            salaryEffectiveFrom: (value: string, values: EmployeeFormValues) => {
              if (!DATE.test(value)) return "Enter the date this salary takes effect";
              if (value < values.startDate) return "Cannot be before the start date";
              return null;
            },
          }
        : {}),
    },
  });

  // Keep the form in step when the employee is reloaded after a save.
  const initialKey = JSON.stringify(initialValues ?? null);
  useEffect(() => {
    if (initialValues) {
      form.setValues(initialValues);
      form.resetDirty(initialValues);
    }
  }, [initialKey]);

  const countries = reference.countries.map((c) => ({ value: c.code, label: c.name }));
  const departments = reference.departments.map((d) => ({ value: d.name, label: d.name }));
  const levels = reference.levels.map((l) => ({ value: l.code, label: l.code }));
  const currencies = [...new Set(reference.countries.map((c) => c.currency))].sort().map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        onSubmit(values);
      })}
      noValidate
    >
      <Stack>
        {serverError !== null && (
          <Alert color="red" role="alert" variant="light">
            {serverError}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {mode === "create" && (
            <TextInput label="Employee code" required {...form.getInputProps("employeeCode")} />
          )}
          <TextInput label="First name" required {...form.getInputProps("firstName")} />
          <TextInput label="Last name" required {...form.getInputProps("lastName")} />
          <TextInput label="Email" type="email" required {...form.getInputProps("email")} />
          <TextInput label="Job title" required {...form.getInputProps("jobTitle")} />
          <Select
            label="Country"
            required
            data={countries}
            searchable
            allowDeselect={false}
            {...form.getInputProps("countryCode")}
          />
          <Select
            label="Department"
            required
            data={departments}
            searchable
            allowDeselect={false}
            {...form.getInputProps("departmentName")}
          />
          <Select
            label="Level"
            required
            data={levels}
            allowDeselect={false}
            {...form.getInputProps("levelCode")}
          />
          <TextInput label="Start date" type="date" required {...form.getInputProps("startDate")} />
          {mode === "edit" && (
            <Select
              label="Status"
              required
              data={[
                { value: "ACTIVE", label: "Active" },
                { value: "LEAVING", label: "Leaving" },
              ]}
              allowDeselect={false}
              {...form.getInputProps("status")}
            />
          )}
        </SimpleGrid>

        {mode === "create" && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <TextInput
                label="Opening salary"
                inputMode="decimal"
                required
                {...form.getInputProps("salaryAmount")}
              />
              <Select
                label="Currency"
                required
                data={currencies}
                allowDeselect={false}
                {...form.getInputProps("salaryCurrency")}
              />
              <TextInput
                label="Salary effective from"
                type="date"
                required
                {...form.getInputProps("salaryEffectiveFrom")}
              />
            </SimpleGrid>
          </>
        )}

        <Group justify="flex-end">
          {onCancel && (
            <Button variant="default" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
