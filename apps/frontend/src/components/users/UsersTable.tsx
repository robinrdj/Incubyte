import { Avatar, Badge, Group, Skeleton, Stack, Table, Text } from "@mantine/core";
import type { HrUserDto } from "@salary/shared";
import { formatDate } from "../../lib/format.js";

export function UsersSkeleton(): React.JSX.Element {
  return (
    <Stack gap="sm" p="md" aria-busy="true" aria-label="Loading HR users">
      {Array.from({ length: 3 }, (_, index) => (
        <Group key={index} gap="sm" wrap="nowrap">
          <Skeleton circle height={32} />
          <Skeleton height={12} width="30%" radius="sm" />
          <Skeleton height={12} width="25%" radius="sm" />
        </Group>
      ))}
    </Stack>
  );
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: HrUserDto[];
  currentUserId: string | undefined;
}): React.JSX.Element {
  return (
    <Table.ScrollContainer minWidth={640}>
      <Table aria-label="HR users" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Added by</Table.Th>
            <Table.Th>Added on</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Avatar size={32} radius="xl" color="initials" name={member.name} />
                  <div>
                    <Group gap={6}>
                      <Text size="sm" fw={600}>
                        {member.name}
                      </Text>
                      {member.id === currentUserId && <Badge size="xs">You</Badge>}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {member.email}
                    </Text>
                  </div>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c={member.createdBy === null ? "dimmed" : "inherit"}>
                  {member.createdBy ?? "First account"}
                </Text>
              </Table.Td>
              <Table.Td>{formatDate(member.createdAt.slice(0, 10))}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
