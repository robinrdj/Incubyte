import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Skeleton,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { FxRateDto, PayBandDto, ReferenceDataDto } from "@salary/shared";
import {
  IconCurrencyDollar,
  IconPencil,
  IconPlus,
  IconScale,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";
import { formatDate, formatMoney } from "../lib/format.js";

const RATE_PATTERN = /^\d{1,10}(\.\d{1,8})?$/;
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export function SettingsPage(): React.JSX.Element {
  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconSettings}
        title="Settings"
        description="Exchange rates turn local salaries into US dollars for the analytics. Pay bands decide who is flagged as below or above their band."
      />
      {/* Both tabs stay mounted and hidden with CSS, so switching never reloads them. The default
          React Activity mode re-runs effects when a tab reappears, which refetched its data. */}
      <Tabs defaultValue="fx" variant="pills" keepMountedMode="display-none">
        <Tabs.List>
          <Tabs.Tab value="fx" leftSection={<IconCurrencyDollar size={16} />}>
            Exchange rates
          </Tabs.Tab>
          <Tabs.Tab value="bands" leftSection={<IconScale size={16} />}>
            Pay bands
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="fx" pt="md">
          <FxRatesPanel />
        </Tabs.Panel>
        <Tabs.Panel value="bands" pt="md">
          <PayBandsPanel />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

/** Currencies that salaries are paid in, other than the reporting currency itself. */
function salaryCurrencies(reference: ReferenceDataDto, reportingCurrency: string): string[] {
  const all = new Set(reference.countries.map((c) => c.currency));
  all.delete(reportingCurrency);
  return [...all].sort();
}

function FxRatesPanel(): React.JSX.Element {
  const { api } = useAuth();
  const rates = useAsync(() => api.fxRates(), []);
  const reference = useAsync(() => api.reference(), []);

  const [currency, setCurrency] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [rateDate, setRateDate] = useState(todayIso);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<FxRateDto | null>(null);
  const [busy, setBusy] = useState(false);

  if (rates.error !== null || reference.error !== null) {
    return (
      <Alert color="red" role="alert" variant="light">
        {errorMessage(rates.error ?? reference.error)}
      </Alert>
    );
  }
  if (rates.data === undefined || reference.data === undefined) {
    return <FxRatesSkeleton />;
  }

  const { reportingCurrency, items } = rates.data;
  const currencies = salaryCurrencies(reference.data, reportingCurrency);
  // Items arrive newest first within each currency, so the first match is the latest rate.
  const latest = new Map<string, FxRateDto>();
  for (const item of items) {
    if (!latest.has(item.currency)) latest.set(item.currency, item);
  }
  const history = currency === null ? [] : items.filter((item) => item.currency === currency);

  function edit(item: FxRateDto): void {
    setCurrency(item.currency);
    setRate(item.rate.replace(/0+$/, "").replace(/\.$/, ""));
    setRateDate(item.rateDate);
    setSaved(null);
    setFormError(null);
  }

  async function save(): Promise<void> {
    setSaved(null);
    if (currency === null) {
      setFormError("Choose a currency.");
      return;
    }
    if (!RATE_PATTERN.test(rate.trim()) || Number(rate) <= 0) {
      setFormError("Enter a rate greater than zero, with up to 8 decimal places.");
      return;
    }
    if (rateDate === "") {
      setFormError("Choose the date the rate applies from.");
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      setSaved(await api.saveFxRate({ currency, rate: rate.trim(), rateDate }));
      rates.reload();
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack>
      <Card>
        <Title order={4}>Latest rates</Title>
        <Text size="sm" c="dimmed" mb="md">
          The value of one unit of each currency in {reportingCurrency}. The analytics use the
          latest rate on or before the date they report on, so adding a rate never changes figures
          for earlier dates.
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
                          if (item) {
                            edit(item);
                          } else {
                            setCurrency(code);
                            setRate("");
                            setSaved(null);
                          }
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

      <Card>
        <Title order={4}>Add or correct a rate</Title>
        <Text size="sm" c="dimmed" mb="md">
          A new date adds a rate from that day on. Saving a date that already has a rate replaces
          it, for correcting a mistake.
        </Text>
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Currency"
            placeholder="Choose"
            data={currencies}
            value={currency}
            onChange={(value) => {
              setCurrency(value);
              setSaved(null);
            }}
            w={140}
          />
          <TextInput
            label={`1 unit in ${reportingCurrency}`}
            placeholder="1.08"
            value={rate}
            onChange={(event) => {
              setRate(event.currentTarget.value);
            }}
            inputMode="decimal"
            w={180}
          />
          <TextInput
            label="Applies from"
            type="date"
            value={rateDate}
            onChange={(event) => {
              setRateDate(event.currentTarget.value);
            }}
            w={180}
          />
          <Button onClick={() => void save()} loading={busy}>
            Save rate
          </Button>
        </Group>
        {formError !== null && (
          <Alert color="red" role="alert" variant="light" mt="md">
            {formError}
          </Alert>
        )}
        {saved !== null && (
          <Text role="status" c="teal" mt="md">
            Saved: 1 {saved.currency} = {Number(saved.rate).toString()} {reportingCurrency} from{" "}
            {formatDate(saved.rateDate)}.
          </Text>
        )}
        {history.length > 0 && (
          <>
            <Title order={5} mt="lg" mb="xs">
              {currency} history
            </Title>
            <Table aria-label={`${currency ?? ""} rate history`}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Applies from</Table.Th>
                  <Table.Th>1 unit in {reportingCurrency}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {history.map((item) => (
                  <Table.Tr key={item.rateDate}>
                    <Table.Td>{formatDate(item.rateDate)}</Table.Td>
                    <Table.Td>{Number(item.rate).toString()}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}
      </Card>
    </Stack>
  );
}

function PayBandsPanel(): React.JSX.Element {
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
                <BandRow
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

function BandRow({
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
  // What is stored now: the band as loaded, then whatever this row last saved.
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

function SkeletonRow({ cells }: { cells: number[] }): React.JSX.Element {
  return (
    <Group
      gap="lg"
      wrap="nowrap"
      py={10}
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
    >
      {cells.map((width, index) => (
        <Skeleton key={index} height={12} width={width} radius="sm" />
      ))}
      <Skeleton height={26} width={72} radius="md" ml="auto" />
    </Group>
  );
}

function FxRatesSkeleton(): React.JSX.Element {
  return (
    <Stack aria-busy="true" aria-label="Loading exchange rates">
      <Card>
        <Skeleton height={16} width={140} radius="sm" />
        <Skeleton height={10} width="70%" radius="sm" mt="sm" mb="lg" />
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonRow key={index} cells={[48, 72, 96]} />
        ))}
      </Card>
      <Card>
        <Skeleton height={16} width={200} radius="sm" />
        <Skeleton height={10} width="60%" radius="sm" mt="sm" mb="lg" />
        <Group gap="md" wrap="wrap" align="flex-end">
          {[140, 180, 180].map((width, index) => (
            <Stack key={index} gap={6}>
              <Skeleton height={10} width={80} radius="sm" />
              <Skeleton height={36} width={width} radius="md" />
            </Stack>
          ))}
          <Skeleton height={36} width={100} radius="md" />
        </Group>
      </Card>
    </Stack>
  );
}

function PayBandsSkeleton(): React.JSX.Element {
  return (
    <Card aria-busy="true" aria-label="Loading pay bands">
      <Group justify="space-between" align="flex-end" mb="md">
        <div>
          <Skeleton height={16} width={110} radius="sm" />
          <Skeleton height={10} width={260} radius="sm" mt="sm" />
        </div>
        <Skeleton height={36} width={220} radius="md" />
      </Group>
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonRow key={index} cells={[32, 110, 110]} />
      ))}
    </Card>
  );
}
