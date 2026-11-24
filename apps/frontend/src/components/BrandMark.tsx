import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconWallet } from "@tabler/icons-react";

export function BrandMark({ size = "md" }: { size?: "md" | "lg" }): React.JSX.Element {
  const large = size === "lg";
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon
        size={large ? 44 : 36}
        radius="md"
        variant="gradient"
        gradient={{ from: "brand", to: "violet", deg: 135 }}
        aria-hidden="true"
      >
        <IconWallet size={large ? 24 : 20} stroke={1.8} />
      </ThemeIcon>
      <div>
        <Text fw={700} size={large ? "lg" : "md"} lh={1.1} ff="var(--mantine-font-family-headings)">
          Salary Management
        </Text>
        <Text size="xs" c="dimmed" lh={1.2}>
          ACME People
        </Text>
      </div>
    </Group>
  );
}
