import { Box, Group, Stack, Text, Tooltip } from "@mantine/core";

export interface HeadcountGroup {
  label: string;
  headcount: number;
}

const count = (value: number): string => value.toLocaleString("en-US");

/** Ranked, largest first, in one hue: the reader compares sizes, not identities. */
export function HeadcountBars({
  groups,
  total,
}: {
  groups: HeadcountGroup[];
  total: number;
}): React.JSX.Element {
  const ranked = [...groups].sort((a, b) => b.headcount - a.headcount);
  const largest = Math.max(1, ...ranked.map((group) => group.headcount));

  return (
    <Stack gap={8} role="list" aria-label="Headcount by group">
      {ranked.map((group) => {
        const share = total === 0 ? 0 : Math.round((group.headcount / total) * 100);
        return (
          <Group key={group.label} gap="sm" wrap="nowrap" role="listitem">
            <Text size="sm" w={120} truncate>
              {group.label}
            </Text>
            <Tooltip label={`${group.label}: ${count(group.headcount)} people (${String(share)}%)`}>
              <Box style={{ flex: 1, minWidth: 0 }} py={4}>
                <Box
                  h={10}
                  w={`${String((group.headcount / largest) * 100)}%`}
                  miw={group.headcount > 0 ? 4 : 0}
                  style={{
                    borderRadius: "0 4px 4px 0",
                    background: "var(--mantine-color-brand-filled)",
                  }}
                />
              </Box>
            </Tooltip>
            <Text size="sm" w={96} ta="right" data-numeric>
              {count(group.headcount)}{" "}
              <Text span size="xs" c="dimmed">
                {share}%
              </Text>
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}
