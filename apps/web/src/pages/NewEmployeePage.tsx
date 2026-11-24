import { Alert, Card, Loader, Stack, Title } from "@mantine/core";
import type { CreateEmployeeRequest } from "@salary/shared";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.js";
import { EmployeeForm, type EmployeeFormValues } from "../components/EmployeeForm.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";

/** Creates an employee with an opening salary, then opens their profile. */
export function NewEmployeePage(): React.JSX.Element {
  const { api } = useAuth();
  const navigate = useNavigate();
  const reference = useAsync(() => api.reference(), []);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function create(values: EmployeeFormValues): Promise<void> {
    const body: CreateEmployeeRequest = {
      employeeCode: values.employeeCode.trim().toUpperCase(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      jobTitle: values.jobTitle.trim(),
      countryCode: values.countryCode,
      departmentName: values.departmentName,
      levelCode: values.levelCode,
      startDate: values.startDate,
      salary: {
        amount: values.salaryAmount.trim(),
        currency: values.salaryCurrency,
        effectiveFrom: values.salaryEffectiveFrom,
      },
    };

    setSaving(true);
    setServerError(null);
    try {
      const created = await api.createEmployee(body);
      void navigate(`/employees/${created.id}`);
    } catch (error) {
      setServerError(errorMessage(error));
      setSaving(false);
    }
  }

  return (
    <Stack>
      <Title order={2}>Add employee</Title>
      <Card>
        {reference.error !== null && (
          <Alert color="red" role="alert" variant="light" mb="md">
            The form options could not be loaded. Try again.
          </Alert>
        )}
        {reference.data === undefined ? (
          <Loader aria-label="Loading form options" />
        ) : (
          <EmployeeForm
            mode="create"
            reference={reference.data}
            saving={saving}
            serverError={serverError}
            submitLabel="Create employee"
            onSubmit={(values) => void create(values)}
            onCancel={() => {
              void navigate("/employees");
            }}
          />
        )}
      </Card>
    </Stack>
  );
}
