import { Box, Group, Text } from "@mantine/core";
import { formatMoney } from "../../lib/format.js";

export interface MedianBar {
  label: string;
  /** Median in USD as a decimal string, or null when a group has no employees. */
  medianUsd: string | null;
}

/** Decorative: the table below carries the same numbers for screen readers. */
export function MedianBars({ bars }: { bars: MedianBar[] }): React.JSX.Element {
  const values = bars.map((bar) => (bar.medianUsd === null ? 0 : Number(bar.medianUsd)));
  const largest = Math.max(1, ...values);

  return (
    <Box aria-hidden="true">
      {bars.map((bar, index) => {
        const value = values[index] ?? 0;
        return (
          <Group key={bar.label} gap="sm" wrap="nowrap" mb={6}>
            <Text size="sm" w={140} truncate>
              {bar.label}
            </Text>
            <Box
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--mantine-color-default-hover)",
                borderRadius: 4,
              }}
            >
              <Box
                style={{
                  width: `${String((value / largest) * 100)}%`,
                  height: 12,
                  borderRadius: 4,
                  background:
                    "linear-gradient(90deg, var(--mantine-color-brand-filled), var(--mantine-color-violet-filled))",
                }}
              />
            </Box>
            <Text size="sm" w={110} ta="right">
              {bar.medianUsd === null ? "—" : formatMoney(bar.medianUsd, "USD")}
            </Text>
          </Group>
        );
      })}
    </Box>
  );
}
