import {
  Anchor,
  Avatar,
  Badge,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconBriefcase, IconBuilding, IconMapPin } from "@tabler/icons-react";
import { Link } from "react-router";
import { useRowLink } from "../../hooks/useRowLink.js";
import { formatMoney } from "../../lib/format.js";
import { BandStatus } from "./BandStatus.js";
import type { EmployeeViewProps } from "./EmployeeTable.js";

export function EmployeeCards({
  employees,
  bandFor,
  bandsLoading,
}: EmployeeViewProps): React.JSX.Element {
  const rowLink = useRowLink();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" p="md" aria-label="Employees">
      {employees.map((employee) => {
        const name = `${employee.firstName} ${employee.lastName}`;
        return (
          <Card
            key={employee.id}
            padding="md"
            shadow="xs"
            component="article"
            aria-label={name}
            {...rowLink(`/employees/${employee.id}`)}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Avatar size={40} radius="xl" color="initials" name={name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Anchor
                  component={Link}
                  to={`/employees/${employee.id}`}
                  fw={600}
                  c="var(--mantine-color-text)"
                  truncate
                  display="block"
                >
                  {name}
                </Anchor>
                <Text size="xs" c="dimmed" truncate>
                  {employee.email}
                </Text>
              </div>
              <Badge color="brand" variant="outline" size="sm">
                {employee.level.code}
              </Badge>
            </Group>

            <Stack gap={4} mt="md">
              <Detail icon={<IconBriefcase size={14} />} text={employee.jobTitle} />
              <Detail icon={<IconBuilding size={14} />} text={employee.department.name} />
              <Detail icon={<IconMapPin size={14} />} text={employee.country.name} />
            </Stack>

            <Divider my="sm" />

            <Group justify="space-between" wrap="nowrap" gap="xs">
              <div>
                <Text size="xs" c="dimmed">
                  Current salary
                </Text>
                <Text fw={700} data-numeric>
                  {employee.currentSalary
                    ? formatMoney(employee.currentSalary.amount, employee.currentSalary.currency)
                    : "—"}
                </Text>
              </div>
              <Group gap={6} wrap="nowrap">
                {employee.status === "LEAVING" && (
                  <Badge size="sm" color="gray">
                    Leaving
                  </Badge>
                )}
                <BandStatus position={bandFor(employee.id)} loading={bandsLoading} />
              </Group>
            </Group>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <Group gap={6} wrap="nowrap" c="dimmed">
      {icon}
      <Text size="sm" c="var(--mantine-color-text)" truncate>
        {text}
      </Text>
    </Group>
  );
}
