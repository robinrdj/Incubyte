import { Skeleton, Text } from "@mantine/core";
import { BandBadge } from "../BandBadge.js";

/** Always takes the same space, so rows do not shift when positions arrive. */
export function BandStatus({
  position,
  loading,
}: {
  position: "BELOW" | "ABOVE" | undefined;
  loading: boolean;
}): React.JSX.Element {
  if (loading) {
    return <Skeleton height={20} width={88} radius="sm" aria-label="Loading pay band" />;
  }
  if (position === undefined) {
    return (
      <Text size="sm" c="dimmed" aria-label="Within band">
        —
      </Text>
    );
  }
  return <BandBadge position={position} />;
}
