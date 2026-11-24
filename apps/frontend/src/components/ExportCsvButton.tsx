import { Button, Group, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { downloadCsv } from "../lib/download.js";
import { errorMessage } from "../lib/errors.js";

export function ExportCsvButton({
  load,
  filename,
  label = "Export CSV",
  size = "xs",
  disabled = false,
}: {
  load: () => Promise<string>;
  filename: string;
  label?: string;
  size?: "xs" | "sm";
  disabled?: boolean;
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
        size={size}
        leftSection={<IconDownload size={size === "xs" ? 14 : 16} />}
        loading={busy}
        disabled={disabled}
        onClick={() => void exportCsv()}
      >
        {label}
      </Button>
    </Group>
  );
}
