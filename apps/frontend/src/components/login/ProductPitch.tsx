import { Badge, Group, Stack, Text, Title } from "@mantine/core";
import { IconCircleCheck, IconSparkles } from "@tabler/icons-react";
import { ProductPreview } from "./ProductPreview.js";

const HIGHLIGHTS = [
  "Median pay by country, department, and level, in US dollars",
  "Everyone outside their pay band, furthest first",
  "A checked CSV import to move off spreadsheets",
];

export function ProductPitch(): React.JSX.Element {
  return (
    <Stack gap="lg" visibleFrom="md">
      <Badge size="lg" leftSection={<IconSparkles size={14} />} w="fit-content">
        Built for HR teams
      </Badge>
      <Title order={1} fz={40} lh={1.1} style={{ letterSpacing: "-0.03em" }}>
        Every salary, every country,{" "}
        <Text
          span
          inherit
          variant="gradient"
          gradient={{ from: "brand.6", to: "violet.6", deg: 90 }}
        >
          one clear picture.
        </Text>
      </Title>
      <Text size="md" c="dimmed" maw={480}>
        Keep ACME&apos;s pay history, pay bands, and exchange rates in one place, and answer how the
        company pays people in seconds.
      </Text>
      <Stack gap="xs">
        {HIGHLIGHTS.map((text) => (
          <Group key={text} gap="sm" wrap="nowrap">
            <IconCircleCheck size={20} color="var(--mantine-color-brand-6)" aria-hidden="true" />
            <Text size="sm">{text}</Text>
          </Group>
        ))}
      </Stack>
      <ProductPreview />
    </Stack>
  );
}
