import { Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import { formatUsd } from "../../lib/format.js";

export interface PayRange {
  label: string;
  minUsd: string | null;
  medianUsd: string | null;
  maxUsd: string | null;
}

const compact = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);

/** Lowest to highest pay per group, with the median as a dot, on one shared scale. */
export function PayRangeChart({ ranges }: { ranges: PayRange[] }): React.JSX.Element {
  const rows = ranges.filter(
    (range) => range.minUsd !== null && range.medianUsd !== null && range.maxUsd !== null,
  );
  const scaleMax = Math.max(1, ...rows.map((range) => Number(range.maxUsd)));
  const position = (value: string | null): string => `${String((Number(value) / scaleMax) * 100)}%`;

  return (
    <Stack gap={10} role="list" aria-label="Pay range by group">
      {rows.map((range) => (
        <Group key={range.label} gap="sm" wrap="nowrap" role="listitem">
          <Text size="sm" w={120} truncate>
            {range.label}
          </Text>
          <Tooltip
            label={`${range.label}: ${formatUsd(range.minUsd)} to ${formatUsd(range.maxUsd)}, median ${formatUsd(range.medianUsd)}`}
          >
            <Box pos="relative" h={14} style={{ flex: 1, minWidth: 0 }}>
              <Box
                pos="absolute"
                top={6}
                h={2}
                left={position(range.minUsd)}
                style={{
                  right: `calc(100% - ${position(range.maxUsd)})`,
                  borderRadius: 1,
                  background: "var(--mantine-color-brand-light-color)",
                  opacity: 0.6,
                }}
              />
              <Box
                pos="absolute"
                top={3}
                w={8}
                h={8}
                left={position(range.medianUsd)}
                style={{
                  transform: "translateX(-50%)",
                  borderRadius: "50%",
                  background: "var(--mantine-color-brand-filled)",
                  boxShadow: "0 0 0 2px var(--mantine-color-body)",
                }}
              />
            </Box>
          </Tooltip>
        </Group>
      ))}
      <Group gap="sm" wrap="nowrap" aria-hidden="true">
        <Box w={120} />
        <Group justify="space-between" style={{ flex: 1 }}>
          <Text size="xs" c="dimmed">
            $0
          </Text>
          <Text size="xs" c="dimmed">
            {compact(scaleMax / 2)}
          </Text>
          <Text size="xs" c="dimmed">
            {compact(scaleMax)}
          </Text>
        </Group>
      </Group>
    </Stack>
  );
}
