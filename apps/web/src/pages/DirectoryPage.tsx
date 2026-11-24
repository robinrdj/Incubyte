import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDownload, IconPlus, IconSearch, IconUserSearch } from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import type { EmployeeDto, EmploymentStatus } from "@salary/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { EmployeeListQuery } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { BandBadge } from "../components/BandBadge.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAsync } from "../hooks/useAsync.js";
import { downloadCsv } from "../lib/download.js";
import { errorMessage } from "../lib/errors.js";
import { formatMoney } from "../lib/format.js";

export const PAGE_SIZE = 25;

type EmployeeFilters = Omit<EmployeeListQuery, "page" | "pageSize">;

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

  /** The filters as the list applies them. The export uses the same object, so they always match. */
  const filters: EmployeeFilters = {
    ...(debouncedSearch === "" ? {} : { search: debouncedSearch }),
    ...(countryCode === null ? {} : { countryCode }),
    ...(departmentName === null ? {} : { departmentName }),
    ...(levelCode === null ? {} : { levelCode }),
    ...(status === "" ? {} : { status: status as EmploymentStatus }),
  };

  const directory = useAsync(
    (query: EmployeeFilters, pageNumber: number) =>
      api.listEmployees({ ...query, page: pageNumber, pageSize: PAGE_SIZE }),
    [filters, page],
  );

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportFiltered(): Promise<void> {
    setExporting(true);
    setExportError(null);
    try {
      downloadCsv("employees.csv", await api.exportCsv(filters));
    } catch (caught) {
      setExportError(errorMessage(caught));
    } finally {
      setExporting(false);
    }
  }

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

  const refreshing = directory.loading && directory.data !== undefined;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Employees"
        description={
          directory.data === undefined
            ? "Everyone on the payroll, with their current salary and pay band."
            : `${total.toLocaleString("en-US")} ${total === 1 ? "person matches" : "people match"} these filters.`
        }
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconDownload size={16} />}
              onClick={() => void exportFiltered()}
              loading={exporting}
              disabled={total === 0}
            >
              Export CSV
            </Button>
            <Button component={Link} to="/employees/new" leftSection={<IconPlus size={16} />}>
              Add employee
            </Button>
          </>
        }
      />

      {exportError !== null && (
        <Alert color="red" role="alert" variant="light" title="The export failed">
          {exportError}
        </Alert>
      )}

      <Card padding={0}>
        <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
            <TextInput
              label="Search"
              placeholder="Name, email, or code"
              leftSection={<IconSearch size={16} />}
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
        </Box>

        {directory.error !== null && (
          <Alert color="red" role="alert" variant="light" m="md">
            The employees could not be loaded. Try again.
          </Alert>
        )}

        {directory.loading && directory.data === undefined ? (
          <Stack gap="sm" p="md" aria-busy="true" aria-label="Loading employees">
            {Array.from({ length: 8 }, (_, index) => (
              <Group key={index} gap="sm" wrap="nowrap">
                <Skeleton circle height={32} />
                <Skeleton height={12} width="30%" radius="sm" />
                <Skeleton height={12} width="20%" radius="sm" />
                <Skeleton height={12} width="15%" radius="sm" />
              </Group>
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <Stack align="center" gap={4} py={48}>
            <IconUserSearch size={32} stroke={1.4} color="var(--mantine-color-dimmed)" />
            <Text fw={500}>No employees match these filters.</Text>
            <Text size="sm" c="dimmed">
              Try a different search, or clear a filter.
            </Text>
          </Stack>
        ) : (
          <Table.ScrollContainer
            minWidth={860}
            aria-busy={refreshing}
            style={{ opacity: refreshing ? 0.55 : 1, transition: "opacity 150ms ease" }}
          >
            <Table aria-label="Employees" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Job title</Table.Th>
                  <Table.Th>Country</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Level</Table.Th>
                  <Table.Th ta="right">Current salary</Table.Th>
                  <Table.Th>Pay band</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar
                          size={32}
                          radius="xl"
                          color="initials"
                          name={`${employee.firstName} ${employee.lastName}`}
                        />
                        <div style={{ minWidth: 0 }}>
                          <Group gap={6} wrap="nowrap">
                            <Text size="sm" fw={500} truncate>
                              {employee.firstName} {employee.lastName}
                            </Text>
                            {employee.status === "LEAVING" && (
                              <Badge size="xs" color="gray">
                                Leaving
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed" truncate>
                            {employee.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/employees/${employee.id}`}
                        size="sm"
                        ff="monospace"
                      >
                        {employee.employeeCode}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{employee.jobTitle}</Table.Td>
                    <Table.Td>{employee.country.name}</Table.Td>
                    <Table.Td>{employee.department.name}</Table.Td>
                    <Table.Td>
                      <Badge color="brand" variant="outline" size="sm">
                        {employee.level.code}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right" fw={500}>
                      {employee.currentSalary
                        ? formatMoney(
                            employee.currentSalary.amount,
                            employee.currentSalary.currency,
                          )
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
          <Group
            justify="space-between"
            wrap="wrap"
            p="md"
            style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
          >
            <Text size="sm" c="dimmed">
              Showing {first.toLocaleString("en-US")}–{last.toLocaleString("en-US")} of{" "}
              {total.toLocaleString("en-US")}
            </Text>
            {totalPages > 1 && (
              <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
            )}
          </Group>
        )}
      </Card>
    </Stack>
  );
}
