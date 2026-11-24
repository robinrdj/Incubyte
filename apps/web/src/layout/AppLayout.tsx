import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Container,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconFileSpreadsheet,
  IconLogout,
  IconSettings,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext.js";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle.js";

const SECTIONS = [
  { to: "/employees", label: "Employees", icon: IconUsers },
  { to: "/analytics", label: "Analytics", icon: IconChartBar },
  { to: "/data-exchange", label: "Import and export", icon: IconFileSpreadsheet },
  { to: "/settings", label: "Settings", icon: IconSettings },
] as const;

/** The app's name and mark, shared by the header and the sign-in page. */
export function BrandMark(): React.JSX.Element {
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon
        size={36}
        radius="md"
        variant="gradient"
        gradient={{ from: "indigo", to: "violet", deg: 135 }}
        aria-hidden="true"
      >
        <IconWallet size={20} stroke={1.8} />
      </ThemeIcon>
      <div>
        <Text fw={700} size="md" lh={1.1}>
          Salary Management
        </Text>
        <Text size="xs" c="dimmed" lh={1.2}>
          ACME People
        </Text>
      </div>
    </Group>
  );
}

/** Header, navigation, and the page area. On phones the navigation collapses behind the burger. */
export function AppLayout(): React.JSX.Element {
  const { signOut, email } = useAuth();
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 248, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
      styles={{ main: { background: "var(--app-page-bg)" } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group wrap="nowrap" gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <BrandMark />
          </Group>
          <Group gap="sm" wrap="nowrap">
            <ColorSchemeToggle />
            {email !== null && (
              <Group gap="xs" wrap="nowrap" visibleFrom="md">
                <Avatar color="indigo" radius="xl" size="md">
                  {email.slice(0, 2).toUpperCase()}
                </Avatar>
                <div>
                  <Text size="sm" fw={500} lh={1.2}>
                    HR Manager
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.2}>
                    {email}
                  </Text>
                </div>
              </Group>
            )}
            <Tooltip label="Sign out">
              <ActionIcon
                variant="default"
                size="lg"
                radius="md"
                aria-label="Sign out"
                onClick={signOut}
              >
                <IconLogout size={18} stroke={1.6} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" aria-label="Main navigation">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="sm" mb="xs">
          Workspace
        </Text>
        <Stack gap={4}>
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              label={section.label}
              leftSection={<section.icon size={18} stroke={1.6} />}
              component={Link}
              to={section.to}
              active={location.pathname.startsWith(section.to)}
              onClick={close}
              variant="light"
              style={{ borderRadius: "var(--mantine-radius-md)" }}
              fw={500}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl" px={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
