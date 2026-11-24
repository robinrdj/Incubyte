import { Card, Group, Skeleton, Stack } from "@mantine/core";

function SkeletonRow({ cells }: { cells: number[] }): React.JSX.Element {
  return (
    <Group
      gap="lg"
      wrap="nowrap"
      py={10}
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
    >
      {cells.map((width, index) => (
        <Skeleton key={index} height={12} width={width} radius="sm" />
      ))}
      <Skeleton height={26} width={72} radius="md" ml="auto" />
    </Group>
  );
}

export function FxRatesSkeleton(): React.JSX.Element {
  return (
    <Stack aria-busy="true" aria-label="Loading exchange rates">
      <Card>
        <Skeleton height={16} width={140} radius="sm" />
        <Skeleton height={10} width="70%" radius="sm" mt="sm" mb="lg" />
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonRow key={index} cells={[48, 72, 96]} />
        ))}
      </Card>
      <Card>
        <Skeleton height={16} width={200} radius="sm" />
        <Skeleton height={10} width="60%" radius="sm" mt="sm" mb="lg" />
        <Group gap="md" wrap="wrap" align="flex-end">
          {[140, 180, 180].map((width, index) => (
            <Stack key={index} gap={6}>
              <Skeleton height={10} width={80} radius="sm" />
              <Skeleton height={36} width={width} radius="md" />
            </Stack>
          ))}
          <Skeleton height={36} width={100} radius="md" />
        </Group>
      </Card>
    </Stack>
  );
}

export function PayBandsSkeleton(): React.JSX.Element {
  return (
    <Card aria-busy="true" aria-label="Loading pay bands">
      <Group justify="space-between" align="flex-end" mb="md">
        <div>
          <Skeleton height={16} width={110} radius="sm" />
          <Skeleton height={10} width={260} radius="sm" mt="sm" />
        </div>
        <Skeleton height={36} width={220} radius="md" />
      </Group>
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonRow key={index} cells={[32, 110, 110]} />
      ))}
    </Card>
  );
}
