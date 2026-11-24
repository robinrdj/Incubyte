import { Alert, Anchor, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { EmployeeDto } from "@salary/shared";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import {
  EmployeeForm,
  valuesFromEmployee,
  type EmployeeFormValues,
} from "../components/employee/EmployeeForm.js";
import { ProfileDetails } from "../components/employee/ProfileDetails.js";
import { ProfileHeader } from "../components/employee/ProfileHeader.js";
import { ProfileError, ProfileSkeleton } from "../components/employee/ProfileStates.js";
import { SalaryCard } from "../components/employee/SalaryCard.js";
import {
  SalaryChangeForm,
  type SalaryChangeValues,
} from "../components/employee/SalaryChangeForm.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";
import { profilePatch } from "../lib/profile-patch.js";

export function EmployeePage(): React.JSX.Element {
  const { id = "" } = useParams();
  const { api } = useAuth();
  const employee = useAsync((employeeId: string) => api.getEmployee(employeeId), [id]);
  const history = useAsync((employeeId: string) => api.salaryHistory(employeeId), [id]);
  const bands = useAsync(
    (employeeId: string) => api.bandViolations({ employeeIds: [employeeId] }),
    [id],
  );
  const reference = useAsync(() => api.reference(), []);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (employee.error !== null) {
    return (
      <ProfileError
        notFound={employee.error instanceof ApiError && employee.error.status === 404}
        message={errorMessage(employee.error)}
      />
    );
  }
  if (employee.data === undefined || reference.data === undefined) {
    return <ProfileSkeleton />;
  }

  const current: EmployeeDto = employee.data;
  const countryCurrency =
    reference.data.countries.find((c) => c.code === current.country.code)?.currency ?? "";
  const band = bands.data?.items.find((item) => item.employeeId === current.id)?.position;
  const records = history.data?.items ?? [];
  const latest = records.at(-1);

  async function saveProfile(values: EmployeeFormValues): Promise<void> {
    const patch = profilePatch(current, values);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateEmployee(current.id, patch);
      employee.reload();
      bands.reload();
      setEditing(false);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function recordSalary(values: SalaryChangeValues): Promise<void> {
    await api.changeSalary(current.id, values);
    employee.reload();
    history.reload();
    bands.reload();
  }

  return (
    <Stack gap="lg">
      <Anchor component={Link} to="/employees" size="sm" c="dimmed">
        <Group gap={4} wrap="nowrap">
          <IconArrowLeft size={14} />
          All employees
        </Group>
      </Anchor>

      <ProfileHeader
        employee={current}
        band={band}
        {...(editing
          ? {}
          : {
              onEdit: () => {
                setEditing(true);
              },
            })}
      />

      <Card>
        <Title order={4} mb="md">
          Profile
        </Title>
        {editing ? (
          <>
            {saveError !== null && (
              <Alert color="red" role="alert" variant="light" mb="md">
                {saveError}
              </Alert>
            )}
            <EmployeeForm
              mode="edit"
              reference={reference.data}
              initialValues={valuesFromEmployee(current)}
              saving={saving}
              serverError={null}
              submitLabel="Save changes"
              onSubmit={(values) => void saveProfile(values)}
              onCancel={() => {
                setEditing(false);
                setSaveError(null);
              }}
            />
          </>
        ) : (
          <ProfileDetails employee={current} />
        )}
      </Card>

      <SalaryCard
        current={current.currentSalary}
        history={records}
        historyFailed={history.error !== null}
      />

      <Card>
        <Title order={4} mb="md">
          Record a salary change
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          A later date adds a new salary to the history. The current salary&apos;s own date corrects
          it, and the change is kept in the audit trail. Earlier dates can&apos;t be changed.
        </Text>
        <SalaryChangeForm
          currency={latest?.currency ?? countryCurrency}
          currentEffectiveFrom={latest?.effectiveFrom}
          onSave={recordSalary}
        />
      </Card>

      <Button variant="subtle" component={Link} to="/employees" w="fit-content">
        Back to employees
      </Button>
    </Stack>
  );
}
