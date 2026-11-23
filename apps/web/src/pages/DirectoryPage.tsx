import {
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { EmployeeDto, EmploymentStatus } from "@salary/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.js";
import { BandBadge } from "../components/BandBadge.js";
import { useAsync } from "../hooks/useAsync.js";
import { formatMoney } from "../lib/format.js";

export const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "LEAVING", label: "Leaving" },
];

/** Employee directory: search, filters, pagination, and a band badge on people outside their band. */
export function DirectoryPage(): React.JSX.Element {
  const { api } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [levelCode, setLevelCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const reference = useAsync(() => api.reference(), []);
  const bands = useAsync(() => api.bandViolations(), []);

  const directory = useAsync(
    (
      term: string,
      country: string,
      department: string,
      level: string,
      state: string,
      pageNumber: number,
    ) =>
      api.listEmployees({
        ...(term === "" ? {} : { search: term }),
        ...(country === "" ? {} : { countryCode: country }),
        ...(department === "" ? {} : { departmentName: department }),
        ...(level === "" ? {} : { levelCode: level }),
        ...(state === "" ? {} : { status: state as EmploymentStatus }),
        page: pageNumber,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, countryCode ?? "", departmentName ?? "", levelCode ?? "", status, page],
  );

  const bandByEmployee = useMemo(
    () => new Map((bands.data?.items ?? []).map((item) => [item.employeeId, item.position])),
    [bands.data],
  );

  const rows: EmployeeDto[] = directory.data?.items ?? [];
  const total = directory.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  const countryOptions = (reference.data?.countries ?? []).map((c) => ({
    value: c.code,
    label: c.name,
  }));
  const departmentOptions = (reference.data?.departments ?? []).map((d) => ({
    value: d.name,
    label: d.name,
  }));
  const levelOptions = (reference.data?.levels ?? []).map((l) => ({
    value: l.code,
    label: l.code,
  }));

  return (
    <Stack>
      <Group justify="space-between" wrap="wrap">
        <Title order={2}>Employees</Title>
        <Button component={Link} to="/employees/new">
          Add employee
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <TextInput
          label="Search"
          placeholder="Name, email, or code"
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
        />
        <Select
          label="Country"
          placeholder="All countries"
          data={countryOptions}
          value={countryCode}
          onChange={(value) => {
            setCountryCode(value);
            setPage(1);
          }}
          clearable
          searchable
        />
        <Select
          label="Department"
          placeholder="All departments"
          data={departmentOptions}
          value={departmentName}
          onChange={(value) => {
            setDepartmentName(value);
            setPage(1);
          }}
          clearable
        />
        <Select
          label="Level"
          placeholder="All levels"
          data={levelOptions}
          value={levelCode}
          onChange={(value) => {
            setLevelCode(value);
            setPage(1);
          }}
          clearable
        />
        <Select
          label="Status"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus(value ?? "");
            setPage(1);
          }}
          allowDeselect={false}
        />
      </SimpleGrid>

      {directory.error !== null && (
        <Alert color="red" role="alert" variant="light">
          The employees could not be loaded. Try again.
        </Alert>
      )}

      {directory.loading && directory.data === undefined ? (
        <Loader aria-label="Loading employees" />
      ) : rows.length === 0 ? (
        <Text c="dimmed">No employees match these filters.</Text>
      ) : (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover aria-label="Employees">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Job title</Table.Th>
                <Table.Th>Country</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Level</Table.Th>
                <Table.Th>Current salary</Table.Th>
                <Table.Th>Pay band</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((employee) => (
                <Table.Tr key={employee.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/employees/${employee.id}`}>
                      {employee.employeeCode}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    {employee.firstName} {employee.lastName}
                  </Table.Td>
                  <Table.Td>{employee.jobTitle}</Table.Td>
                  <Table.Td>{employee.country.name}</Table.Td>
                  <Table.Td>{employee.department.name}</Table.Td>
                  <Table.Td>{employee.level.code}</Table.Td>
                  <Table.Td>
                    {employee.currentSalary
                      ? formatMoney(employee.currentSalary.amount, employee.currentSalary.currency)
                      : "—"}
                  </Table.Td>
                  <Table.Td>
                    <BandBadge position={bandByEmployee.get(employee.id)} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {total > 0 && (
        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed">
            Showing {first}–{last} of {total}
          </Text>
          {totalPages > 1 && <Pagination total={totalPages} value={page} onChange={setPage} />}
        </Group>
      )}
    </Stack>
  );
}
