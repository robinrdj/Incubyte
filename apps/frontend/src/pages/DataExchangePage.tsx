import { Stack } from "@mantine/core";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader.js";
import { ImportCard } from "../components/data-exchange/ImportCard.js";
import { ExportCard } from "../components/data-exchange/ExportCard.js";

export function DataExchangePage(): React.JSX.Element {
  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconFileSpreadsheet}
        title="Import and export"
        description="The import and export use the same columns, so an exported file can be changed and imported again."
      />
      <ExportCard />
      <ImportCard />
    </Stack>
  );
}
