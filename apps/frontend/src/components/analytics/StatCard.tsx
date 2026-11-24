import { Box, Card, Group, Text, ThemeIcon } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: string;
  icon: typeof IconUsers;
  note?: string;
}): React.JSX.Element {
  return (
    <Card padding="md" role="group" aria-label={label}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: "0.04em" }}>
          {label}
        </Text>
        <ThemeIcon variant="light" radius="md" size="md" aria-hidden="true">
          <Icon size={16} stroke={1.7} />
        </ThemeIcon>
      </Group>
      <Box mt={4}>
        <Text fz={22} fw={700} lh={1.3}>
          {value}
        </Text>
        {note !== undefined && (
          <Text size="xs" c="dimmed" mt={2}>
            {note}
          </Text>
        )}
      </Box>
    </Card>
  );
}
