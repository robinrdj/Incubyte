import { Stack, Table, Text, Title } from "@mantine/core";
import { type ImportReportDto } from "@salary/shared";

export function ImportSummary({
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
