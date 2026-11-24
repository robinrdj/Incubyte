import { Alert, Button, Card, FileInput, Group, Stack, Text, Title } from "@mantine/core";
import { type ImportReportDto } from "@salary/shared";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { errorMessage } from "../../lib/errors.js";
import { readFileText } from "../../lib/files.js";
import { ImportSummary } from "./ImportSummary.js";

export function ImportCard(): React.JSX.Element {
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
    <Card>
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
