import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { EmployeeDto, UpdateEmployeeRequest } from "@salary/shared";
import { IconArrowLeft, IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { BandBadge } from "../components/BandBadge.js";
import {
  EmployeeForm,
  valuesFromEmployee,
  type EmployeeFormValues,
} from "../components/EmployeeForm.js";
import { SalaryChangeForm, type SalaryChangeValues } from "../components/SalaryChangeForm.js";
import { SalaryTimeline } from "../components/SalaryTimeline.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";
import { formatDate, formatMoney } from "../lib/format.js";

/** The profile page: details, edit, current salary, salary history, and recording a salary change. */
export function EmployeePage(): React.JSX.Element {
  const { id = "" } = useParams();
  const { api } = useAuth();
  const employee = useAsync((employeeId: string) => api.getEmployee(employeeId), [id]);
  const history = useAsync((employeeId: string) => api.salaryHistory(employeeId), [id]);
  const bands = useAsync(() => api.bandViolations(), []);
  const reference = useAsync(() => api.reference(), []);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (employee.error !== null) {
    const notFound = employee.error instanceof ApiError && employee.error.status === 404;
    return (
      <Stack>
        <Title order={2}>{notFound ? "Employee not found" : "Employee"}</Title>
        <Alert color="red" role="alert" variant="light">
          {notFound ? "This employee does not exist." : errorMessage(employee.error)}
        </Alert>
        <Text>
          <Link to="/employees">Back to employees</Link>
        </Text>
      </Stack>
    );
  }

  const loaded: EmployeeDto | undefined = employee.data;
  if (loaded === undefined || reference.data === undefined) {
    return (
      <Stack gap="lg" aria-busy="true" aria-label="Loading employee">
        <Card>
          <Group gap="md" wrap="nowrap">
            <Skeleton circle height={64} />
            <Stack gap={8} style={{ flex: 1 }}>
              <Skeleton height={20} width="40%" radius="sm" />
              <Skeleton height={12} width="60%" radius="sm" />
            </Stack>
          </Group>
        </Card>
        <Skeleton height={180} radius="lg" />
      </Stack>
    );
  }
  // A const after the guard, so the callbacks below see the narrowed type.
  const current: EmployeeDto = loaded;
  const countryCurrency =
    reference.data.countries.find((c) => c.code === current.country.code)?.currency ?? "";

  const band = bands.data?.items.find((item) => item.employeeId === current.id)?.position;
  const records = history.data?.items ?? [];
  const latest = records[records.length - 1];

  async function saveProfile(values: EmployeeFormValues): Promise<void> {
    const original = valuesFromEmployee(current);
    // Send only the fields that changed, so a save never rewrites data the user did not touch.
    const patch: UpdateEmployeeRequest = {};
    if (values.firstName !== original.firstName) patch.firstName = values.firstName.trim();
    if (values.lastName !== original.lastName) patch.lastName = values.lastName.trim();
    if (values.email !== original.email) patch.email = values.email.trim().toLowerCase();
    if (values.jobTitle !== original.jobTitle) patch.jobTitle = values.jobTitle.trim();
    if (values.countryCode !== original.countryCode) patch.countryCode = values.countryCode;
    if (values.departmentName !== original.departmentName)
      patch.departmentName = values.departmentName;
    if (values.levelCode !== original.levelCode) patch.levelCode = values.levelCode;
    if (values.status !== original.status) patch.status = values.status;

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
      <Card>
        <Group justify="space-between" wrap="wrap" align="center" gap="md">
          <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar
              size={64}
              radius="xl"
              color="initials"
              name={`${current.firstName} ${current.lastName}`}
            />
            <div style={{ minWidth: 0 }}>
              <Title order={2} fz={{ base: 22, sm: 26 }} lh={1.2}>
                {current.firstName} {current.lastName}
              </Title>
              <Text c="dimmed" size="sm">
                {current.jobTitle} · {current.department.name} · {current.country.name}
              </Text>
              <Group gap="xs" mt={6}>
                <Badge color="gray" ff="monospace">
                  {current.employeeCode}
                </Badge>
                <Badge color="indigo" variant="outline">
                  {current.level.code}
                </Badge>
                {current.status === "LEAVING" && <Badge color="gray">Leaving</Badge>}
                <BandBadge position={band} />
              </Group>
            </div>
          </Group>
          {!editing && (
            <Button
              variant="default"
              leftSection={<IconPencil size={16} />}
              onClick={() => {
                setEditing(true);
              }}
            >
              Edit profile
            </Button>
          )}
        </Group>
      </Card>

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
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Detail label="Email" value={current.email} />
            <Detail label="Job title" value={current.jobTitle} />
            <Detail label="Country" value={current.country.name} />
            <Detail label="Department" value={current.department.name} />
            <Detail label="Level" value={current.level.code} />
            <Detail label="Start date" value={formatDate(current.startDate)} />
            <Detail label="Status" value={current.status === "ACTIVE" ? "Active" : "Leaving"} />
          </SimpleGrid>
        )}
      </Card>

      <Card>
        <Title order={4}>Current salary</Title>
        <Text size="xl" fw={600} mt="xs">
          {current.currentSalary
            ? formatMoney(current.currentSalary.amount, current.currentSalary.currency)
            : "No salary recorded"}
        </Text>
        <Divider my="md" />
        <Title order={4} mb="md">
          Salary history
        </Title>
        {history.error !== null ? (
          <Alert color="red" role="alert" variant="light">
            The salary history could not be loaded.
          </Alert>
        ) : (
          <SalaryTimeline records={records} />
        )}
      </Card>

      <Card>
        <Title order={4} mb="md">
          Record a salary change
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Past salary records are never edited. A change must take effect after the current salary.
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

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text>{value}</Text>
    </div>
  );
}
