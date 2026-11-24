import { Alert, Card, Divider, Text, Title } from "@mantine/core";
import type { SalaryDto } from "@salary/shared";
import { formatMoney } from "../../lib/format.js";
import { SalaryTimeline } from "./SalaryTimeline.js";

export function SalaryCard({
  current,
  history,
  historyFailed,
}: {
  current: SalaryDto | null;
  history: SalaryDto[];
  historyFailed: boolean;
}): React.JSX.Element {
  return (
    <Card>
      <Title order={4}>Current salary</Title>
      <Text size="xl" fw={600} mt="xs">
        {current ? formatMoney(current.amount, current.currency) : "No salary recorded"}
      </Text>
      <Divider my="md" />
      <Title order={4} mb="md">
        Salary history
      </Title>
      {historyFailed ? (
        <Alert color="red" role="alert" variant="light">
          The salary history could not be loaded.
        </Alert>
      ) : (
        <SalaryTimeline records={history} />
      )}
    </Card>
  );
}
