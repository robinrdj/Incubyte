import { Button, Group, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { downloadCsv } from "../lib/download.js";
import { errorMessage } from "../lib/errors.js";

export function ExportCsvButton({
  load,
  filename,
  label = "Export CSV",
}: {
  load: () => Promise<string>;
  filename: string;
  label?: string;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      downloadCsv(filename, await load());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Group gap="xs" wrap="nowrap">
      {error !== null && (
        <Text size="xs" c="red" role="alert">
          {error}
        </Text>
      )}
      <Button
        variant="default"
        size="xs"
        leftSection={<IconDownload size={14} />}
        loading={busy}
        onClick={() => void exportCsv()}
      >
        {label}
      </Button>
    </Group>
  );
}
