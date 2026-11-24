import { Anchor, Avatar, Badge, Group, Table, Text } from "@mantine/core";
import type { EmployeeDto } from "@salary/shared";
import { Link } from "react-router";
import { useRowLink } from "../../hooks/useRowLink.js";
import { formatMoney } from "../../lib/format.js";
import { BandStatus } from "./BandStatus.js";

export interface EmployeeViewProps {
  employees: EmployeeDto[];
  bandFor: (employeeId: string) => "BELOW" | "ABOVE" | undefined;
  bandsLoading: boolean;
}

export function EmployeeTable({
  employees,
  bandFor,
  bandsLoading,
}: EmployeeViewProps): React.JSX.Element {
  const rowLink = useRowLink();

  return (
    <Table.ScrollContainer minWidth={900}>
      <Table aria-label="Employees" horizontalSpacing="md" layout="fixed">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w="26%">Employee</Table.Th>
            <Table.Th w={120}>Code</Table.Th>
            <Table.Th>Job title</Table.Th>
            <Table.Th w={130}>Country</Table.Th>
            <Table.Th w={120}>Department</Table.Th>
            <Table.Th w={70}>Level</Table.Th>
            <Table.Th w={140} ta="right">
              Current salary
            </Table.Th>
            <Table.Th w={120}>Pay band</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map((employee) => (
            <Table.Tr key={employee.id} {...rowLink(`/employees/${employee.id}`)}>
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
                      <Anchor
                        component={Link}
                        to={`/employees/${employee.id}`}
                        size="sm"
                        fw={600}
                        c="var(--mantine-color-text)"
                        truncate
                      >
                        {employee.firstName} {employee.lastName}
                      </Anchor>
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
                <Text size="sm" ff="monospace" c="dimmed">
                  {employee.employeeCode}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" truncate>
                  {employee.jobTitle}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" truncate>
                  {employee.country.name}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" truncate>
                  {employee.department.name}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color="brand" variant="outline" size="sm">
                  {employee.level.code}
                </Badge>
              </Table.Td>
              <Table.Td ta="right" fw={500}>
                {employee.currentSalary
                  ? formatMoney(employee.currentSalary.amount, employee.currentSalary.currency)
                  : "—"}
              </Table.Td>
              <Table.Td>
                <BandStatus position={bandFor(employee.id)} loading={bandsLoading} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
