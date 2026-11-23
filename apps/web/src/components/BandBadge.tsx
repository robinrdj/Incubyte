import { Badge } from "@mantine/core";
import { bandLabel } from "../lib/format.js";

/** Marks an employee whose salary is outside their level and country band. Renders nothing otherwise. */
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
