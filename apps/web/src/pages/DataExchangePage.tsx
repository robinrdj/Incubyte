import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { EMPLOYEE_CSV_COLUMNS, type EmploymentStatus, type ImportReportDto } from "@salary/shared";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { useAsync } from "../hooks/useAsync.js";
import { downloadCsv } from "../lib/download.js";
import { errorMessage } from "../lib/errors.js";
import { readFileText } from "../lib/files.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "LEAVING", label: "Leaving" },
];

/** Export employees to CSV, and import a CSV with a check-first step and row-level errors. */
export function DataExchangePage(): React.JSX.Element {
  return (
    <Stack>
      <div>
        <Title order={2}>Import and export</Title>
        <Text c="dimmed" size="sm">
          The import and export use the same columns, so an exported file can be changed and
          imported again.
        </Text>
      </div>
      <ExportCard />
      <ImportCard />
    </Stack>
  );
}

function ExportCard(): React.JSX.Element {
  const { api } = useAuth();
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countries = useAsync(() => api.reference(), []);

  async function exportEmployees(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const csv = await api.exportCsv({
        ...(countryCode === null ? {} : { countryCode }),
        ...(status === "" ? {} : { status: status as EmploymentStatus }),
      });
      downloadCsv("employees.csv", csv);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Title order={4}>Export employees</Title>
      <Group align="flex-end" mt="md" wrap="wrap">
        <Select
          label="Country"
          placeholder="All countries"
          data={(countries.data?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
          value={countryCode}
          onChange={setCountryCode}
          clearable
          searchable
          w={220}
        />
        <Select
          label="Status"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus(value ?? "");
          }}
          allowDeselect={false}
          w={180}
        />
        <Button onClick={() => void exportEmployees()} loading={busy}>
          Download CSV
        </Button>
        <Button
          variant="default"
          onClick={() => {
            downloadCsv("employees-template.csv", `${EMPLOYEE_CSV_COLUMNS.join(",")}\r\n`);
          }}
        >
          Download blank template
        </Button>
      </Group>
      {error !== null && (
        <Alert color="red" role="alert" variant="light" mt="md">
          {error}
        </Alert>
      )}
    </Card>
  );
}

function ImportCard(): React.JSX.Element {
  const { api } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [checked, setChecked] = useState<{ text: string; report: ImportReportDto } | null>(null);
  const [applied, setApplied] = useState<ImportReportDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(): Promise<void> {
    if (file === null) return;
    setBusy(true);
    setError(null);
    setApplied(null);
    try {
      const text = await readFileText(file);
      const report = await api.importEmployees(text, true);
      setChecked({ text, report });
    } catch (caught) {
      setChecked(null);
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function apply(): Promise<void> {
    if (checked === null) return;
    setBusy(true);
    setError(null);
    try {
      const report = await api.importEmployees(checked.text, false);
      setApplied(report);
      setChecked(null);
      setFile(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const report = applied ?? checked?.report ?? null;
  const canApply = checked !== null && checked.report.created + checked.report.updated > 0;

  return (
    <Card withBorder radius="md" padding="lg">
      <Title order={4}>Import employees</Title>
      <Text size="sm" c="dimmed" mb="md">
        Check the file first to see what would change. Rows with errors are skipped, and the rest
        are applied. Importing the same file twice changes nothing the second time.
      </Text>

      <Stack>
        <FileInput
          label="CSV file"
          placeholder="Choose a .csv file"
          accept=".csv,text/csv"
          value={file}
          onChange={(next) => {
            setFile(next);
            setChecked(null);
            setApplied(null);
          }}
          clearable
        />
        <Group>
          <Button
            variant="default"
            disabled={file === null}
            loading={busy && checked === null}
            onClick={() => void check()}
          >
            Check file
          </Button>
          <Button
            disabled={!canApply}
            loading={busy && checked !== null}
            onClick={() => void apply()}
          >
            Import {checked ? checked.report.created + checked.report.updated : ""} change(s)
          </Button>
        </Group>

        {error !== null && (
          <Alert color="red" role="alert" variant="light" title="The file could not be imported">
            {error}
          </Alert>
        )}

        {report !== null && <ImportSummary report={report} dryRun={applied === null} />}
      </Stack>
    </Card>
  );
}

function ImportSummary({
  report,
  dryRun,
}: {
  report: ImportReportDto;
  dryRun: boolean;
}): React.JSX.Element {
  return (
    <Stack gap="xs">
      <Title order={5}>
        {dryRun ? "Check result (nothing has been saved yet)" : "Import complete"}
      </Title>
      <Text role="status" aria-live="polite">
        {report.totalRows} row(s): {report.created} to create, {report.updated} to update,{" "}
        {report.unchanged} unchanged, {report.rejected} rejected.
      </Text>
      {report.errors.length > 0 && (
        <Table.ScrollContainer minWidth={560}>
          <Table striped aria-label="Rows with errors">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Line</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Problem</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.errors.map((row) => (
                <Table.Tr key={row.line}>
                  <Table.Td>{row.line}</Table.Td>
                  <Table.Td>{row.email || "—"}</Table.Td>
                  <Table.Td>{row.messages.join("; ")}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
