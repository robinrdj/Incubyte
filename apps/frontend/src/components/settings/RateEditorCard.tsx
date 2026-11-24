import { Alert, Button, Card, Group, Select, Table, Text, TextInput, Title } from "@mantine/core";
import type { FxRateDto } from "@salary/shared";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { errorMessage } from "../../lib/errors.js";
import { formatDate } from "../../lib/format.js";
import { RATE_PATTERN } from "../../lib/validation.js";

export interface RateDraft {
  currency: string | null;
  rate: string;
  rateDate: string;
}

function RateHistory({
  currency,
  items,
  reportingCurrency,
}: {
  currency: string;
  items: FxRateDto[];
  reportingCurrency: string;
}): React.JSX.Element {
  return (
    <>
      <Title order={5} mt="lg" mb="xs">
        {currency} history
      </Title>
      <Table aria-label={`${currency} rate history`}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Applies from</Table.Th>
            <Table.Th>1 unit in {reportingCurrency}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.rateDate}>
              <Table.Td>{formatDate(item.rateDate)}</Table.Td>
              <Table.Td>{Number(item.rate).toString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}

export function RateEditorCard({
  initial,
  currencies,
  rates,
  reportingCurrency,
  onSaved,
}: {
  initial: RateDraft;
  currencies: string[];
  rates: FxRateDto[];
  reportingCurrency: string;
  onSaved: () => void;
}): React.JSX.Element {
  const { api } = useAuth();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<FxRateDto | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (change: Partial<RateDraft>): void => {
    setDraft((current) => ({ ...current, ...change }));
  };
  const history =
    draft.currency === null ? [] : rates.filter((item) => item.currency === draft.currency);

  async function save(): Promise<void> {
    setSaved(null);
    const { currency, rate, rateDate } = draft;
    if (currency === null) {
      setError("Choose a currency.");
      return;
    }
    if (!RATE_PATTERN.test(rate.trim()) || Number(rate) <= 0) {
      setError("Enter a rate greater than zero, with up to 8 decimal places.");
      return;
    }
    if (rateDate === "") {
      setError("Choose the date the rate applies from.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setSaved(await api.saveFxRate({ currency, rate: rate.trim(), rateDate }));
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Title order={4}>Add or correct a rate</Title>
      <Text size="sm" c="dimmed" mb="md">
        A new date adds a rate from that day on. Saving a date that already has a rate replaces it,
        for correcting a mistake.
      </Text>
      <Group align="flex-end" wrap="wrap">
        <Select
          label="Currency"
          placeholder="Choose"
          data={currencies}
          value={draft.currency}
          onChange={(value) => {
            update({ currency: value });
            setSaved(null);
          }}
          w={140}
        />
        <TextInput
          label={`1 unit in ${reportingCurrency}`}
          placeholder="1.08"
          value={draft.rate}
          onChange={(event) => {
            update({ rate: event.currentTarget.value });
          }}
          inputMode="decimal"
          w={180}
        />
        <TextInput
          label="Applies from"
          type="date"
          value={draft.rateDate}
          onChange={(event) => {
            update({ rateDate: event.currentTarget.value });
          }}
          w={180}
        />
        <Button onClick={() => void save()} loading={busy}>
          Save rate
        </Button>
      </Group>
      {error !== null && (
        <Alert color="red" role="alert" variant="light" mt="md">
          {error}
        </Alert>
      )}
      {saved !== null && (
        <Text role="status" c="teal" mt="md">
          Saved: 1 {saved.currency} = {Number(saved.rate).toString()} {reportingCurrency} from{" "}
          {formatDate(saved.rateDate)}.
        </Text>
      )}
      {draft.currency !== null && history.length > 0 && (
        <RateHistory
          currency={draft.currency}
          items={history}
          reportingCurrency={reportingCurrency}
        />
      )}
    </Card>
  );
}
