import { Alert, Card, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

export function ProfileSkeleton(): React.JSX.Element {
  return (
    <Stack gap="lg" aria-busy="true" aria-label="Loading employee">
      <Card>
        <Group gap="md" wrap="nowrap">
          <Skeleton circle height={64} />
          <Stack gap={8} style={{ flex: 1 }}>
            <Skeleton height={20} width="40%" radius="sm" />
            <Skeleton height={12} width="60%" radius="sm" />
          </Stack>
        </Group>
      </Card>
      <Skeleton height={180} radius="lg" />
    </Stack>
  );
}

export function ProfileError({
  notFound,
  message,
}: {
  notFound: boolean;
  message: string;
}): React.JSX.Element {
  return (
    <Stack>
      <Title order={2}>{notFound ? "Employee not found" : "Employee"}</Title>
      <Alert color="red" role="alert" variant="light">
        {notFound ? "This employee does not exist." : message}
      </Alert>
      <Text>
        <Link to="/employees">Back to employees</Link>
      </Text>
    </Stack>
  );
}
