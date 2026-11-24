import { Badge, Box, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

/** Illustrative figures, not read from the database. */
const PREVIEW_BARS = [
  { label: "United States", value: 132, width: 100 },
  { label: "United Kingdom", value: 104, width: 79 },
  { label: "Germany", value: 98, width: 74 },
  { label: "India", value: 31, width: 24 },
];

function PreviewStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} data-numeric>
        {value}
      </Text>
    </div>
  );
}

export function ProductPreview(): React.JSX.Element {
  return (
    <Paper withBorder radius="md" p="md" shadow="md" maw={480} aria-hidden="true">
      <Group justify="space-between" mb="md">
        <Text size="sm" fw={600}>
          Median base pay by country
        </Text>
        <Badge color="gray">USD</Badge>
      </Group>
      <Stack gap={10}>
        {PREVIEW_BARS.map((bar) => (
          <Group key={bar.label} gap="sm" wrap="nowrap">
            <Text size="xs" c="dimmed" w={100}>
              {bar.label}
            </Text>
            <Box style={{ flex: 1 }}>
              <Box
                h={10}
                w={`${String(bar.width)}%`}
                style={{
                  borderRadius: 6,
                  background:
                    "linear-gradient(90deg, var(--mantine-color-brand-filled), var(--mantine-color-violet-filled))",
                }}
              />
            </Box>
            <Text size="xs" fw={600} w={44} ta="right" data-numeric>
              ${bar.value}k
            </Text>
          </Group>
        ))}
      </Stack>
      <SimpleGrid cols={3} mt="md" spacing="sm">
        <PreviewStat label="Employees" value="10,000" />
        <PreviewStat label="Countries" value="10" />
        <PreviewStat label="Outside band" value="26%" />
      </SimpleGrid>
    </Paper>
  );
}
