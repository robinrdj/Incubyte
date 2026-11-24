import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

/** Switches between light and dark mode. Mantine remembers the choice in local storage. */
export function ColorSchemeToggle(): React.JSX.Element {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const next = computed === "dark" ? "light" : "dark";
  const label = `Switch to ${next} mode`;

  return (
    <Tooltip label={label}>
      <ActionIcon
        variant="default"
        size="lg"
        radius="md"
        aria-label={label}
        onClick={() => {
          setColorScheme(next);
        }}
      >
        {computed === "dark" ? (
          <IconSun size={18} stroke={1.6} />
        ) : (
          <IconMoon size={18} stroke={1.6} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
