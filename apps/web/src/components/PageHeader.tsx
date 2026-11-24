import { Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** The title block at the top of every page: a heading, a short description, and page actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}): React.JSX.Element {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" mb="xs">
      <div style={{ minWidth: 0 }}>
        <Title order={2} fz={{ base: 24, sm: 28 }} lh={1.2}>
          {title}
        </Title>
        {description !== undefined && (
          <Text c="dimmed" size="sm" mt={4} maw={680}>
            {description}
          </Text>
        )}
      </div>
      {actions !== undefined && (
        <Group gap="sm" align="flex-end" wrap="wrap">
          {actions}
        </Group>
      )}
    </Group>
  );
}
