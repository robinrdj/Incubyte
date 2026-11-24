import { Group, Text, ThemeIcon, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  icon: PageIcon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: Icon;
}): React.JSX.Element {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" mb="xs">
      <Group gap="md" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
        {PageIcon !== undefined && (
          <ThemeIcon size={44} radius="md" variant="light" visibleFrom="sm" aria-hidden="true">
            <PageIcon size={24} stroke={1.6} />
          </ThemeIcon>
        )}
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
      </Group>
      {actions !== undefined && (
        <Group gap="sm" align="flex-end" wrap="wrap">
          {actions}
        </Group>
      )}
    </Group>
  );
}
