import { Alert, Button, Group, SimpleGrid, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";

export interface SalaryChangeValues {
  amount: string;
  currency: string;
  effectiveFrom: string;
}

interface SalaryChangeFormProps {
  /** Currency to start from: the employee's current salary currency. */
  currency: string;
  /** The current salary's date. A change must be after it, because history is append-only. */
  currentEffectiveFrom: string | undefined;
  onSave: (values: SalaryChangeValues) => Promise<void>;
}

const AMOUNT = /^\d+(\.\d{1,2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Records a new salary. Past records are never edited, so the new date must be later than the current one. */
export function SalaryChangeForm({
  currency,
  currentEffectiveFrom,
  onSave,
}: SalaryChangeFormProps): React.JSX.Element {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<SalaryChangeValues>({
    mode: "controlled",
    initialValues: { amount: "", currency, effectiveFrom: "" },
    validate: {
      amount: (value) =>
        AMOUNT.test(value.trim()) && Number(value) > 0
          ? null
          : "Enter an amount such as 96000.00 (up to two decimals)",
      currency: (value) =>
        /^[A-Z]{3}$/.test(value.trim().toUpperCase()) ? null : "Use a three-letter code",
      effectiveFrom: (value) => {
        if (!DATE.test(value)) return "Enter the date this salary takes effect";
        if (currentEffectiveFrom !== undefined && value <= currentEffectiveFrom) {
          return `Must be after the current salary date (${currentEffectiveFrom})`;
        }
        return null;
      },
    },
  });

  async function submit(values: SalaryChangeValues): Promise<void> {
    setServerError(null);
    setSaving(true);
    try {
      await onSave({ ...values, currency: values.currency.trim().toUpperCase() });
      form.reset();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The salary could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={form.onSubmit((values) => void submit(values))}
      noValidate
      aria-label="Record salary change"
    >
      {serverError !== null && (
        <Alert color="red" role="alert" variant="light" mb="sm">
          {serverError}
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <TextInput
          label="New salary"
          inputMode="decimal"
          required
          {...form.getInputProps("amount")}
        />
        <TextInput label="Currency" required {...form.getInputProps("currency")} />
        <TextInput
          label="Effective from"
          type="date"
          required
          {...form.getInputProps("effectiveFrom")}
        />
      </SimpleGrid>
      <Group justify="flex-end" mt="md">
        <Button type="submit" loading={saving}>
          Record salary change
        </Button>
      </Group>
    </form>
  );
}
