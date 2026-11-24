import { Avatar, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconLogout, IconUsersGroup } from "@tabler/icons-react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.js";

export function UserMenu(): React.JSX.Element | null {
  const { user, signOut } = useAuth();
  if (user === null) return null;

  return (
    <Menu position="bottom-end" width={240} shadow="md" radius="md">
      <Menu.Target>
        <UnstyledButton aria-label="Account menu">
          <Group gap="xs" wrap="nowrap">
            <Avatar color="initials" name={user.name} radius="xl" size={34} />
            <div style={{ lineHeight: 1.2 }}>
              <Text size="sm" fw={600} visibleFrom="md">
                {user.name}
              </Text>
              <Text size="xs" c="dimmed" visibleFrom="md">
                {user.email}
              </Text>
            </div>
            <IconChevronDown size={14} stroke={1.8} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Signed in as {user.email}</Menu.Label>
        <Menu.Item component={Link} to="/users" leftSection={<IconUsersGroup size={16} />}>
          HR users
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
