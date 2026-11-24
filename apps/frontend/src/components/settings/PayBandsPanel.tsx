import { Alert, Card, Group, Select, Table, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { useAsync } from "../../hooks/useAsync.js";
import { errorMessage } from "../../lib/errors.js";
import { PayBandsSkeleton } from "./SettingsSkeletons.js";
import { PayBandRow } from "./PayBandRow.js";

export function PayBandsPanel(): React.JSX.Element {
  const { api } = useAuth();
  const reference = useAsync(() => api.reference(), []);
  const bands = useAsync(() => api.payBands(), []);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  if (reference.error !== null || bands.error !== null) {
    return (
      <Alert color="red" role="alert" variant="light">
        {errorMessage(reference.error ?? bands.error)}
      </Alert>
    );
  }
  if (reference.data === undefined || bands.data === undefined) {
    return <PayBandsSkeleton />;
  }

  const country =
    reference.data.countries.find((c) => c.code === countryCode) ?? reference.data.countries[0];
  if (country === undefined) {
    return <Text c="dimmed">There are no countries yet.</Text>;
  }
  const bandFor = new Map(
    bands.data.items
      .filter((band) => band.countryCode === country.code)
      .map((band) => [band.levelCode, band]),
  );

  return (
    <Card>
      <Group justify="space-between" align="flex-end" wrap="wrap" mb="md">
        <div>
          <Title order={4}>Pay bands</Title>
          <Text size="sm" c="dimmed">
            Minimum and maximum base salary for each level, in {country.currency}.
          </Text>
        </div>
        <Select
          label="Country"
          data={reference.data.countries.map((c) => ({ value: c.code, label: c.name }))}
          value={country.code}
          onChange={setCountryCode}
          allowDeselect={false}
          searchable
          w={220}
        />
      </Group>
      <Table.ScrollContainer minWidth={560}>
        <Table aria-label={`Pay bands in ${country.name}`}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Level</Table.Th>
              <Table.Th>Minimum</Table.Th>
              <Table.Th>Maximum</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {reference.data.levels.map((level) => {
              const band = bandFor.get(level.code);
              return (
                <PayBandRow
                  key={`${country.code}:${level.code}`}
                  countryCode={country.code}
                  currency={country.currency}
                  levelCode={level.code}
                  band={band}
                  onSaved={bands.reload}
                />
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
