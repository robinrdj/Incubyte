import { Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

export function NotFoundPage(): React.JSX.Element {
  return (
    <Stack>
      <Title order={2}>Page not found</Title>
      <Text>
        That page does not exist. <Link to="/employees">Go to employees</Link>
      </Text>
    </Stack>
  );
}
