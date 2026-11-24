import { Skeleton, Text } from "@mantine/core";
import { BandBadge } from "../BandBadge.js";

/**
 * The band badge with its space always reserved: a badge-sized placeholder while positions load,
 * then the badge, or a dash for someone within their band. The row never changes size.
 */
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
