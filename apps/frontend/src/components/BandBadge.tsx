import { Badge } from "@mantine/core";
import { bandLabel } from "../lib/format.js";

export function BandBadge({
  position,
}: {
  position: "BELOW" | "ABOVE" | undefined;
}): React.JSX.Element | null {
  if (position === undefined) {
    return null;
  }
  return (
    <Badge
      color={position === "ABOVE" ? "orange" : "red"}
      variant="light"
      aria-label={bandLabel(position)}
    >
      {bandLabel(position)}
    </Badge>
  );
}
