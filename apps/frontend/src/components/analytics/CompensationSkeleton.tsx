import { Card, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export function CompensationSkeleton(): React.JSX.Element {
  return (
    <Stack gap="lg" aria-busy="true" aria-label="Loading analytics">
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} padding="md">
            <Skeleton height={10} width="45%" radius="sm" />
            <Skeleton height={22} width="75%" radius="sm" mt="md" />
          </Card>
        ))}
      </SimpleGrid>
      <Card>
        <Skeleton height={16} width={220} radius="sm" />
        <Skeleton height={10} width={140} radius="sm" mt="xs" mb="lg" />
        {[92, 78, 64, 55, 47, 38].map((width) => (
          <Group key={width} gap="sm" wrap="nowrap" mb={10}>
            <Skeleton height={12} width={120} radius="sm" />
            <Skeleton height={12} width={`${String(width)}%`} radius="sm" />
          </Group>
        ))}
      </Card>
    </Stack>
  );
}
