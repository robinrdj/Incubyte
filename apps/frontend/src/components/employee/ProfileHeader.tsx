import { Avatar, Badge, Button, Card, Group, Text, Title } from "@mantine/core";
import type { EmployeeDto } from "@salary/shared";
import { IconPencil } from "@tabler/icons-react";
import { BandBadge } from "../BandBadge.js";

export function ProfileHeader({
  employee,
  band,
  onEdit,
}: {
  employee: EmployeeDto;
  band: "BELOW" | "ABOVE" | undefined;
  /** Omitted while the profile is being edited. */
  onEdit?: () => void;
}): React.JSX.Element {
  const name = `${employee.firstName} ${employee.lastName}`;

  return (
    <Card>
      <Group justify="space-between" wrap="wrap" align="center" gap="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar size={64} radius="xl" color="initials" name={name} />
          <div style={{ minWidth: 0 }}>
            <Title order={2} fz={{ base: 22, sm: 26 }} lh={1.2}>
              {name}
            </Title>
            <Text c="dimmed" size="sm">
              {employee.jobTitle} · {employee.department.name} · {employee.country.name}
            </Text>
            <Group gap="xs" mt={6}>
              <Badge color="gray" ff="monospace">
                {employee.employeeCode}
              </Badge>
              <Badge color="brand" variant="outline">
                {employee.level.code}
              </Badge>
              {employee.status === "LEAVING" && <Badge color="gray">Leaving</Badge>}
              <BandBadge position={band} />
            </Group>
          </div>
        </Group>
        {onEdit !== undefined && (
          <Button variant="default" leftSection={<IconPencil size={16} />} onClick={onEdit}>
            Edit profile
          </Button>
        )}
      </Group>
    </Card>
  );
}
