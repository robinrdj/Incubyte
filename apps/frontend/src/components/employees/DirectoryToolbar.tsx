import {
  Center,
  Group,
  Pagination,
  SegmentedControl,
  Text,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import type { EmploymentStatus } from "@salary/shared";
import { IconLayoutGrid, IconLayoutList, type Icon } from "@tabler/icons-react";
import type { DirectoryView } from "../../hooks/useDirectoryView.js";

const count = (value: number): string => value.toLocaleString("en-US");

function ViewOption({ label, icon: ViewIcon }: { label: string; icon: Icon }): React.JSX.Element {
  return (
    <Tooltip label={label} withArrow>
      <Center>
        <ViewIcon size={16} />
        <VisuallyHidden>{label}</VisuallyHidden>
      </Center>
    </Tooltip>
  );
}

export function DirectoryToolbar({
  total,
  statusCounts,
  view,
  onViewChange,
}: {
  total: number;
  statusCounts: Record<EmploymentStatus, number> | undefined;
  view: DirectoryView;
  onViewChange: (view: DirectoryView) => void;
}): React.JSX.Element {
  return (
    <Group
      justify="space-between"
      px="md"
      py="xs"
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
    >
      <Text size="sm" c="dimmed" data-numeric aria-label="Employee count">
        <Text span fw={600} c="var(--mantine-color-text)">
          {count(total)} {total === 1 ? "employee" : "employees"}
        </Text>
        {statusCounts !== undefined &&
          ` · ${count(statusCounts.ACTIVE)} active · ${count(statusCounts.LEAVING)} leaving`}
      </Text>
      <SegmentedControl
        size="xs"
        value={view}
        onChange={(value) => {
          onViewChange(value === "cards" ? "cards" : "table");
        }}
        aria-label="Layout"
        data={[
          { value: "table", label: <ViewOption label="Table view" icon={IconLayoutList} /> },
          { value: "cards", label: <ViewOption label="Card view" icon={IconLayoutGrid} /> },
        ]}
      />
    </Group>
  );
}

export function DirectoryFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}): React.JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <Group
      justify="space-between"
      wrap="wrap"
      p="md"
      style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
    >
      <Text size="sm" c="dimmed">
        Showing {count(first)}–{count(last)} of {count(total)}
      </Text>
      {totalPages > 1 && (
        <Pagination total={totalPages} value={page} onChange={onPageChange} size="sm" />
      )}
    </Group>
  );
}
