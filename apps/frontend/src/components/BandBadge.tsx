import { Badge } from "@mantine/core";
import { bandLabel } from "../lib/format.js";

/** Same colours as the pay band split chart, so "below" looks the same everywhere. */
export function BandBadge({
  position,
}: {
  position: "BELOW" | "ABOVE" | undefined;
}): React.JSX.Element | null {
  if (position === undefined) {
    return null;
  }
  const colour = position === "ABOVE" ? "var(--band-above)" : "var(--band-below)";
  return (
    <Badge
      variant="light"
      aria-label={bandLabel(position)}
      style={{
        color: colour,
        background: `color-mix(in srgb, ${colour} 14%, transparent)`,
      }}
    >
      {bandLabel(position)}
    </Badge>
  );
}
