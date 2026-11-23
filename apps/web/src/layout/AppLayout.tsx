import { AppShell, Burger, Button, Group, NavLink, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext.js";

const SECTIONS = [
  { to: "/employees", label: "Employees" },
  { to: "/analytics", label: "Analytics" },
  { to: "/data-exchange", label: "Import and export" },
] as const;

/** Header, navigation, and the page area. On phones the navigation collapses behind the burger. */
export function AppLayout(): React.JSX.Element {
  const { signOut } = useAuth();
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Title order={3}>Salary Management</Title>
          </Group>
          <Button variant="subtle" onClick={signOut}>
            Sign out
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" aria-label="Main navigation">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            label={section.label}
            component={Link}
            to={section.to}
            active={location.pathname.startsWith(section.to)}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
