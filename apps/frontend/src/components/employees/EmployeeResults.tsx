import { Box, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconUserSearch } from "@tabler/icons-react";
import type { DirectoryView } from "../../hooks/useDirectoryView.js";
import { EmployeeCards } from "./EmployeeCards.js";
import { EmployeeTable, type EmployeeViewProps } from "./EmployeeTable.js";

export function EmployeeResults({
  view,
  loading,
  refreshing,
  ...viewProps
}: EmployeeViewProps & {
  view: DirectoryView;
  loading: boolean;
  refreshing: boolean;
}): React.JSX.Element {
  if (loading) {
    return (
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
    );
  }

  if (viewProps.employees.length === 0) {
    return (
      <Stack align="center" gap={4} py={48}>
        <IconUserSearch size={32} stroke={1.4} color="var(--mantine-color-dimmed)" />
        <Text fw={500}>No employees match these filters.</Text>
        <Text size="sm" c="dimmed">
          Try a different search, or clear a filter.
        </Text>
      </Stack>
    );
  }

  return (
    <Box
      aria-busy={refreshing}
      style={{ opacity: refreshing ? 0.55 : 1, transition: "opacity 150ms ease" }}
    >
      {view === "table" ? <EmployeeTable {...viewProps} /> : <EmployeeCards {...viewProps} />}
    </Box>
  );
}
