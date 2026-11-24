import { Text, Timeline } from "@mantine/core";
import type { SalaryDto } from "@salary/shared";
import { formatDate, formatMoney } from "../lib/format.js";

/** Salary history, newest first. Records are append-only, so the list only grows over time. */
export function SalaryTimeline({ records }: { records: SalaryDto[] }): React.JSX.Element {
  if (records.length === 0) {
    return <Text c="dimmed">No salary recorded yet.</Text>;
  }

  const newestFirst = [...records].reverse();
  return (
    <Timeline active={0} bulletSize={18} lineWidth={2} aria-label="Salary history">
      {newestFirst.map((record, index) => (
        <Timeline.Item
          key={`${record.effectiveFrom}-${record.amount}`}
          title={formatMoney(record.amount, record.currency)}
        >
          <Text size="sm" c="dimmed">
            Effective {formatDate(record.effectiveFrom)}
            {index === 0 ? " (current)" : ""}
          </Text>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
