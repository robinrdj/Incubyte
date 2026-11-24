import { Card, Group, Loader, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import type { CompensationReportDto } from "@salary/shared";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartBar,
  IconMathAvg,
  IconUsers,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext.js";
import { ExportCsvButton } from "../ExportCsvButton.js";
import { MedianBars } from "./MedianBars.js";
import { formatUsd } from "../../lib/format.js";
import { GROUP_OPTIONS } from "./group-options.js";
import { StatCard } from "./StatCard.js";

export function CompensationView({
  report,
  updating,
}: {
  report: CompensationReportDto;
  updating: boolean;
}): React.JSX.Element {
  const { api } = useAuth();
  const groupName = GROUP_OPTIONS.find((o) => o.value === report.groupBy)?.label ?? "Group";

  return (
    <Stack
      gap="lg"
      aria-busy={updating}
      style={{ opacity: updating ? 0.55 : 1, transition: "opacity 150ms ease" }}
    >
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        <StatCard
          label="Headcount"
          value={report.overall.headcount.toLocaleString("en-US")}
          icon={IconUsers}
          note={
            report.excludedLeaving > 0
              ? `Active only · ${report.excludedLeaving.toLocaleString("en-US")} leaving not counted`
              : "Active employees"
          }
        />
        <StatCard label="Median" value={formatUsd(report.overall.medianUsd)} icon={IconChartBar} />
        <StatCard label="Average" value={formatUsd(report.overall.averageUsd)} icon={IconMathAvg} />
        <StatCard label="Lowest" value={formatUsd(report.overall.minUsd)} icon={IconArrowDownRight} />
        <StatCard label="Highest" value={formatUsd(report.overall.maxUsd)} icon={IconArrowUpRight} />
      </SimpleGrid>
      {report.excludedWithoutSalary > 0 && (
        <Text size="sm" c="dimmed">
          {report.excludedWithoutSalary} active employee(s) had no salary on this date and are not
          counted.
        </Text>
      )}

      <Card>
        <Group justify="space-between" mb="md" wrap="nowrap">
          <div>
            <Title order={4}>Median pay by {groupName.toLowerCase()}</Title>
            <Text size="sm" c="dimmed">
              {report.groups.length} {report.groups.length === 1 ? "group" : "groups"}, as of{" "}
              {report.asOf}
            </Text>
          </div>
          <Group gap="md" wrap="nowrap">
            {updating && (
              <Group gap={6} role="status" aria-live="polite" wrap="nowrap">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Updating…
                </Text>
              </Group>
            )}
            <ExportCsvButton
              filename={`compensation-by-${report.groupBy}-${report.asOf}.csv`}
              load={() => api.compensationCsv(report.groupBy, report.asOf)}
            />
          </Group>
        </Group>
        <MedianBars
          bars={report.groups.map((group) => ({
            label: group.label,
            medianUsd: group.summary.medianUsd,
          }))}
        />
        <Table.ScrollContainer minWidth={640} mt="lg">
          <Table striped aria-label={`Compensation by ${report.groupBy}`}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{groupName}</Table.Th>
                <Table.Th ta="right">Headcount</Table.Th>
                <Table.Th ta="right">Median</Table.Th>
                <Table.Th ta="right">Average</Table.Th>
                <Table.Th ta="right">Lowest</Table.Th>
                <Table.Th ta="right">Highest</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.groups.map((group) => (
                <Table.Tr key={group.key}>
                  <Table.Td fw={500}>{group.label}</Table.Td>
                  <Table.Td ta="right">{group.summary.headcount.toLocaleString("en-US")}</Table.Td>
                  <Table.Td ta="right">{formatUsd(group.summary.medianUsd)}</Table.Td>
                  <Table.Td ta="right">{formatUsd(group.summary.averageUsd)}</Table.Td>
                  <Table.Td ta="right">{formatUsd(group.summary.minUsd)}</Table.Td>
                  <Table.Td ta="right">{formatUsd(group.summary.maxUsd)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
