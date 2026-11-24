import { Box, Group, Text, Tooltip } from "@mantine/core";

interface Part {
  key: "below" | "within" | "above";
  label: string;
  count: number;
}

const count = (value: number): string => value.toLocaleString("en-US");
const percent = (part: number, whole: number): string =>
  whole === 0 ? "0%" : `${String(Math.round((part / whole) * 100))}%`;

/** Share printed inside a block only when the block is wide enough to hold it. */
const MIN_LABEL_SHARE = 0.08;

/** Below, within, and above band as one bar: diverging colours around a neutral middle. */
export function BandSplitBar({
  below,
  within,
  above,
}: {
  below: number;
  within: number;
  above: number;
}): React.JSX.Element {
  const total = below + within + above;
  const parts: Part[] = [
    { key: "below", label: "Below band", count: below },
    { key: "within", label: "Within band", count: within },
    { key: "above", label: "Above band", count: above },
  ];
  const summary = parts
    .map((part) => `${part.label}: ${count(part.count)} (${percent(part.count, total)})`)
    .join(", ");

  return (
    <div>
      <Group
        gap={2}
        wrap="nowrap"
        h={28}
        role="img"
        aria-label={`Pay band position of ${count(total)} employees. ${summary}.`}
      >
        {parts
          .filter((part) => part.count > 0)
          .map((part) => (
            <Tooltip
              key={part.key}
              label={`${part.label}: ${count(part.count)} people (${percent(part.count, total)})`}
              withArrow
            >
              <Box
                h="100%"
                style={{
                  flexGrow: part.count,
                  flexBasis: 0,
                  minWidth: 4,
                  borderRadius: 4,
                  background: `var(--band-${part.key})`,
                  display: "flex",
                  alignItems: "center",
                  paddingInline: 8,
                }}
              >
                {part.count / total >= MIN_LABEL_SHARE && (
                  <Text size="xs" fw={700} c="white" data-numeric aria-hidden="true">
                    {percent(part.count, total)}
                  </Text>
                )}
              </Box>
            </Tooltip>
          ))}
      </Group>
      <Group gap="lg" mt="sm" aria-hidden="true">
        {parts.map((part) => (
          <Group key={part.key} gap={6} wrap="nowrap">
            <Box w={10} h={10} style={{ borderRadius: 2, background: `var(--band-${part.key})` }} />
            <Text size="sm">{part.label}</Text>
            <Text size="sm" c="dimmed" data-numeric>
              {count(part.count)}
            </Text>
          </Group>
        ))}
      </Group>
    </div>
  );
}
