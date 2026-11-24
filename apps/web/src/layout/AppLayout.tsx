import { AppShell, Burger, Container, Group, NavLink, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconFileSpreadsheet,
  IconSettings,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router";
import { BrandMark } from "../components/BrandMark.js";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle.js";
import { UserMenu } from "../components/UserMenu.js";

interface Section {
  to: string;
  label: string;
  icon: Icon;
}

const NAVIGATION: { title: string; sections: Section[] }[] = [
  {
    title: "Workspace",
    sections: [
      { to: "/employees", label: "Employees", icon: IconUsers },
      { to: "/analytics", label: "Analytics", icon: IconChartBar },
      { to: "/data-exchange", label: "Import and export", icon: IconFileSpreadsheet },
    ],
  },
  {
    title: "Administration",
    sections: [
      { to: "/settings", label: "Settings", icon: IconSettings },
      { to: "/users", label: "HR users", icon: IconUsersGroup },
    ],
  },
];

export function AppLayout(): React.JSX.Element {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 256, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
      styles={{
        main: { background: "var(--app-page-bg)" },
        navbar: { background: "var(--app-sidebar-bg)" },
      }}
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
          <Group gap="md" wrap="nowrap">
            <ColorSchemeToggle />
            <UserMenu />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" aria-label="Main navigation">
        <Stack gap="lg">
          {NAVIGATION.map((group) => (
            <div key={group.title}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mb={6} lts="0.08em">
                {group.title}
              </Text>
              <Stack gap={2}>
                {group.sections.map((section) => (
                  <NavLink
                    key={section.to}
                    label={section.label}
                    leftSection={<section.icon size={18} stroke={1.7} />}
                    component={Link}
                    to={section.to}
                    active={location.pathname.startsWith(section.to)}
                    onClick={close}
                    variant="light"
                    fw={500}
                    py={9}
                    style={{ borderRadius: "var(--mantine-radius-md)" }}
                  />
                ))}
              </Stack>
            </div>
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
