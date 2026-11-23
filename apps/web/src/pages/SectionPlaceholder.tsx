import { Stack, Text, Title } from "@mantine/core";

/** Placeholder for a section whose screens are built in a later stage. */
export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <Stack>
      <Title order={2}>{title}</Title>
      <Text c="dimmed">{description}</Text>
    </Stack>
  );
}
