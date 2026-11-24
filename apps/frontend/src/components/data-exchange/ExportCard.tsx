import { Alert, Button, Card, Group, Select, Title } from "@mantine/core";
import { EMPLOYEE_CSV_COLUMNS, type EmploymentStatus } from "@salary/shared";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { useAsync } from "../../hooks/useAsync.js";
import { downloadCsv } from "../../lib/download.js";
import { errorMessage } from "../../lib/errors.js";

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "LEAVING", label: "Leaving" },
];

export function ExportCard(): React.JSX.Element {
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
        ...(countryCode === null ? {} : { countryCode: [countryCode] }),
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
    <Card>
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
