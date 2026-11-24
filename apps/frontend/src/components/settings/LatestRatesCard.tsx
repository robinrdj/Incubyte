import { Badge, Button, Card, Table, Text, Title } from "@mantine/core";
import type { FxRateDto } from "@salary/shared";
import { formatDate } from "../../lib/format.js";

export function LatestRatesCard({
  currencies,
  latest,
  reportingCurrency,
  onChange,
}: {
  currencies: string[];
  latest: Map<string, FxRateDto>;
  reportingCurrency: string;
  onChange: (currency: string, current: FxRateDto | undefined) => void;
}): React.JSX.Element {
  return (
    <Card>
      <Title order={4}>Latest rates</Title>
      <Text size="sm" c="dimmed" mb="md">
        The value of one unit of each currency in {reportingCurrency}. The analytics use the latest
        rate on or before the date they report on, so adding a rate never changes figures for
        earlier dates.
      </Text>
      <Table.ScrollContainer minWidth={520}>
        <Table striped aria-label="Latest exchange rates">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Currency</Table.Th>
              <Table.Th>1 unit in {reportingCurrency}</Table.Th>
              <Table.Th>Applies from</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {currencies.map((code) => {
              const item = latest.get(code);
              return (
                <Table.Tr key={code}>
                  <Table.Td>{code}</Table.Td>
                  <Table.Td>
                    {item ? (
                      Number(item.rate).toString()
                    ) : (
                      <Badge color="red" variant="light">
                        No rate
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>{item ? formatDate(item.rateDate) : "—"}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      aria-label={`Change the ${code} rate`}
                      onClick={() => {
                        onChange(code, item);
                      }}
                    >
                      Change
                    </Button>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
