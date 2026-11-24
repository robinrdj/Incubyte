import { Badge, Button, Group, Table, Text, TextInput } from "@mantine/core";
import type { PayBandDto } from "@salary/shared";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { errorMessage } from "../../lib/errors.js";
import { formatMoney } from "../../lib/format.js";
import { AMOUNT_PATTERN } from "../../lib/validation.js";

export function PayBandRow({
  countryCode,
  currency,
  levelCode,
  band,
  onSaved,
}: {
  countryCode: string;
  currency: string;
  levelCode: string;
  band: PayBandDto | undefined;
  onSaved: () => void;
}): React.JSX.Element {
  const { api } = useAuth();
  const [stored, setStored] = useState(band ? { min: band.minAmount, max: band.maxAmount } : null);
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  function startEditing(): void {
    setMin(stored?.min ?? "");
    setMax(stored?.max ?? "");
    setError(null);
    setSavedNote(false);
    setEditing(true);
  }

  async function save(): Promise<void> {
    const minimum = min.trim();
    const maximum = max.trim();
    if (!AMOUNT_PATTERN.test(minimum) || !AMOUNT_PATTERN.test(maximum)) {
      setError("Enter both amounts as numbers with up to two decimals.");
      return;
    }
    if (Number(minimum) <= 0) {
      setError("The minimum must be greater than zero.");
      return;
    }
    if (Number(maximum) < Number(minimum)) {
      setError("The maximum cannot be below the minimum.");
      return;
    }
    setError(null);
    if (
      stored !== null &&
      Number(minimum) === Number(stored.min) &&
      Number(maximum) === Number(stored.max)
    ) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.savePayBand(countryCode, levelCode, {
        minAmount: minimum,
        maxAmount: maximum,
      });
      setStored({ min: saved.minAmount, max: saved.maxAmount });
      setEditing(false);
      setSavedNote(true);
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={600}>{levelCode}</Text>
      </Table.Td>
      {editing ? (
        <>
          <Table.Td>
            <TextInput
              aria-label={`${levelCode} minimum`}
              value={min}
              onChange={(event) => {
                setMin(event.currentTarget.value);
              }}
              inputMode="decimal"
              rightSection={
                <Text size="xs" c="dimmed">
                  {currency}
                </Text>
              }
              rightSectionWidth={44}
              data-autofocus
            />
          </Table.Td>
          <Table.Td>
            <TextInput
              aria-label={`${levelCode} maximum`}
              value={max}
              onChange={(event) => {
                setMax(event.currentTarget.value);
              }}
              inputMode="decimal"
              rightSection={
                <Text size="xs" c="dimmed">
                  {currency}
                </Text>
              }
              rightSectionWidth={44}
              error={error}
            />
          </Table.Td>
          <Table.Td>
            <Group gap="xs" wrap="nowrap" justify="flex-end">
              <Button
                size="xs"
                loading={busy}
                onClick={() => void save()}
                aria-label={`Save ${levelCode} band`}
              >
                Save
              </Button>
              <Button
                size="xs"
                variant="default"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                aria-label={`Cancel editing ${levelCode} band`}
              >
                Cancel
              </Button>
            </Group>
          </Table.Td>
        </>
      ) : (
        <>
          <Table.Td>
            {stored ? (
              formatMoney(stored.min, currency)
            ) : (
              <Text c="dimmed" size="sm">
                —
              </Text>
            )}
          </Table.Td>
          <Table.Td>
            {stored ? (
              formatMoney(stored.max, currency)
            ) : (
              <Badge color="gray" size="sm">
                Not set
              </Badge>
            )}
          </Table.Td>
          <Table.Td>
            <Group gap="xs" wrap="nowrap" justify="flex-end">
              {savedNote && (
                <Text size="xs" c="teal" role="status">
                  Saved
                </Text>
              )}
              <Button
                size="xs"
                variant="light"
                leftSection={stored ? <IconPencil size={14} /> : <IconPlus size={14} />}
                onClick={startEditing}
                aria-label={`${stored ? "Edit" : "Add"} ${levelCode} band`}
              >
                {stored ? "Edit" : "Add band"}
              </Button>
            </Group>
          </Table.Td>
        </>
      )}
    </Table.Tr>
  );
}
