import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Pagination,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { CompensationReportDto, GroupBy } from "@salary/shared";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartBar,
  IconMathAvg,
  IconUsers,
} from "@tabler/icons-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.js";
import { BandBadge } from "../components/BandBadge.js";
import { MedianBars } from "../components/MedianBars.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAsync } from "../hooks/useAsync.js";
import { useRowLink } from "../hooks/useRowLink.js";
import { errorMessage } from "../lib/errors.js";
import { formatMoney } from "../lib/format.js";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "country", label: "Country" },
  { value: "department", label: "Department" },
  { value: "level", label: "Level" },
];

/** Rows per page in the out-of-band list. */
export const BAND_PAGE_SIZE = 25;

/** How long a reload must take before "Updating" appears, so cached switches do not flicker. */
const UPDATING_DELAY_MS = 150;

const money = (value: string | null): string => (value === null ? "—" : formatMoney(value, "USD"));

/** Compensation dashboard: overall figures, grouped breakdown, and employees outside their pay band. */
export function AnalyticsPage(): React.JSX.Element {
  const { api } = useAuth();
  const [groupBy, setGroupBy] = useState<GroupBy>("country");
  const [asOf, setAsOf] = useState("");

  // Each grouping costs a full pass over the salaries, so results are kept per grouping and date.
  // Switching back is instant, and the other groupings are fetched once the first one has loaded.
  const cache = useRef(new Map<string, Promise<CompensationReportDto>>());
  const loadCompensation = useCallback(
    (group: GroupBy, date: string): Promise<CompensationReportDto> => {
      const key = `${group}|${date}`;
      const cached = cache.current.get(key);
      if (cached !== undefined) return cached;
      const request = api.compensation(group, date === "" ? undefined : date);
      cache.current.set(key, request);
      // A failed request is not kept, so the next attempt asks the API again.
      request.catch(() => cache.current.delete(key));
      return request;
    },
    [api],
  );

  const compensation = useAsync(loadCompensation, [groupBy, asOf]);

  const firstLoaded = compensation.data !== undefined;
  useEffect(() => {
    if (!firstLoaded) return;
    for (const option of GROUP_OPTIONS) {
      loadCompensation(option.value, asOf).catch(() => undefined);
    }
  }, [firstLoaded, asOf, loadCompensation]);

  const [slowLoading] = useDebouncedValue(compensation.loading, UPDATING_DELAY_MS);
  const updating = compensation.loading && slowLoading && compensation.data !== undefined;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Analytics"
        description="Active employees, in US dollars at the exchange rate in force on the chosen date."
        actions={
          <>
            <Select
              label="Group by"
              data={GROUP_OPTIONS}
              value={groupBy}
              onChange={(value) => {
                setGroupBy(value ?? "country");
              }}
              allowDeselect={false}
              w={170}
            />
            <TextInput
              label="As of (optional)"
              type="date"
              value={asOf}
              onChange={(event) => {
                setAsOf(event.currentTarget.value);
              }}
              w={170}
            />
            {asOf !== "" && (
              <Button
                variant="subtle"
                onClick={() => {
                  setAsOf("");
                }}
              >
                Use today
              </Button>
            )}
          </>
        }
      />

      {compensation.error !== null && (
        <Alert
          color="red"
          role="alert"
          variant="light"
          title="The analytics could not be calculated"
        >
          {errorMessage(compensation.error)}
        </Alert>
      )}

      {compensation.data === undefined ? (
        compensation.loading && <CompensationSkeleton />
      ) : (
        <CompensationView report={compensation.data} updating={updating} />
      )}

      {/* Keyed by date, so a new date starts again at page 1 with no filter. */}
      <BandViolationsCard key={asOf} asOf={asOf} />
    </Stack>
  );
}

function CompensationView({
  report,
  updating,
}: {
  report: CompensationReportDto;
  updating: boolean;
}): React.JSX.Element {
  const groupName = GROUP_OPTIONS.find((o) => o.value === report.groupBy)?.label ?? "Group";

  return (
    <Stack
      gap="lg"
      aria-busy={updating}
      style={{ opacity: updating ? 0.55 : 1, transition: "opacity 150ms ease" }}
    >
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        <Stat
          label="Headcount"
          value={report.overall.headcount.toLocaleString("en-US")}
          icon={IconUsers}
        />
        <Stat label="Median" value={money(report.overall.medianUsd)} icon={IconChartBar} />
        <Stat label="Average" value={money(report.overall.averageUsd)} icon={IconMathAvg} />
        <Stat label="Lowest" value={money(report.overall.minUsd)} icon={IconArrowDownRight} />
        <Stat label="Highest" value={money(report.overall.maxUsd)} icon={IconArrowUpRight} />
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
          {updating && (
            <Group gap={6} role="status" aria-live="polite" wrap="nowrap">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                Updating…
              </Text>
            </Group>
          )}
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
                  <Table.Td ta="right">{money(group.summary.medianUsd)}</Table.Td>
                  <Table.Td ta="right">{money(group.summary.averageUsd)}</Table.Td>
                  <Table.Td ta="right">{money(group.summary.minUsd)}</Table.Td>
                  <Table.Td ta="right">{money(group.summary.maxUsd)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

/** Placeholder in the shape of the dashboard while the first figures load. */
function CompensationSkeleton(): React.JSX.Element {
  return (
    <Stack gap="lg" aria-busy="true" aria-label="Loading analytics">
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} padding="md">
            <Skeleton height={10} width="45%" radius="sm" />
            <Skeleton height={22} width="75%" radius="sm" mt="md" />
          </Card>
        ))}
      </SimpleGrid>
      <Card>
        <Skeleton height={16} width={220} radius="sm" />
        <Skeleton height={10} width={140} radius="sm" mt="xs" mb="lg" />
        {[92, 78, 64, 55, 47, 38].map((width) => (
          <Group key={width} gap="sm" wrap="nowrap" mb={10}>
            <Skeleton height={12} width={120} radius="sm" />
            <Skeleton height={12} width={`${String(width)}%`} radius="sm" />
          </Group>
        ))}
      </Card>
    </Stack>
  );
}

type PositionFilter = "ALL" | "BELOW" | "ABOVE";

/**
 * Employees outside their band, a page at a time. The server sorts (furthest from the band first),
 * filters, and pages, so the browser receives 25 rows rather than thousands. Memoised so that
 * changing the grouping above does not re-render it.
 */
const BandViolationsCard = memo(function BandViolationsCard({
  asOf,
}: {
  asOf: string;
}): React.JSX.Element {
  const { api } = useAuth();
  const rowLink = useRowLink();
  const [filter, setFilter] = useState<PositionFilter>("ALL");
  const [page, setPage] = useState(1);

  const result = useAsync(
    (date: string, position: PositionFilter, pageNumber: number) =>
      api.bandViolations({
        ...(date === "" ? {} : { asOf: date }),
        ...(position === "ALL" ? {} : { position }),
        page: pageNumber,
        pageSize: BAND_PAGE_SIZE,
      }),
    [asOf, filter, page],
  );
  const report = result.data;
  const refreshing = result.loading && report !== undefined;
  const totalPages =
    report === undefined ? 1 : Math.max(1, Math.ceil(report.total / BAND_PAGE_SIZE));
  const outside = report === undefined ? 0 : report.below + report.above;
  const firstRow = report === undefined ? 0 : (report.page - 1) * BAND_PAGE_SIZE + 1;

  return (
    <Card>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Title order={4}>Outside their pay band</Title>
          <Text size="sm" c="dimmed">
            Furthest from their band first. Compa-ratio is salary divided by the band midpoint.
          </Text>
        </div>
        {report !== undefined && outside > 0 && (
          <SegmentedControl
            size="xs"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            data={[
              { value: "ALL", label: `All ${outside.toLocaleString("en-US")}` },
              { value: "BELOW", label: `Below ${report.below.toLocaleString("en-US")}` },
              { value: "ABOVE", label: `Above ${report.above.toLocaleString("en-US")}` },
            ]}
            aria-label="Show employees"
          />
        )}
      </Group>

      {result.error !== null && (
        <Alert color="red" role="alert" variant="light" mt="md">
          {errorMessage(result.error)}
        </Alert>
      )}

      {report === undefined && result.loading && (
        <Stack gap="sm" mt="lg" aria-busy="true" aria-label="Loading pay bands">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} height={28} radius="sm" />
          ))}
        </Stack>
      )}

      {report !== undefined && (
        <>
          <Group gap="xs" mt="md" mb="md">
            <Badge color="gray">{report.evaluated.toLocaleString("en-US")} evaluated</Badge>
            <Badge color="orange">{outside.toLocaleString("en-US")} outside</Badge>
            {report.withoutBand > 0 && (
              <Badge color="red">{report.withoutBand.toLocaleString("en-US")} without a band</Badge>
            )}
          </Group>
          {outside === 0 ? (
            <Text>Everyone evaluated is within their band.</Text>
          ) : (
            <>
              <Table.ScrollContainer
                minWidth={760}
                aria-busy={refreshing}
                style={{ opacity: refreshing ? 0.55 : 1, transition: "opacity 150ms ease" }}
              >
                <Table aria-label="Employees outside their pay band">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Country</Table.Th>
                      <Table.Th>Level</Table.Th>
                      <Table.Th ta="right">Salary (USD)</Table.Th>
                      <Table.Th ta="right">Band (USD)</Table.Th>
                      <Table.Th ta="right">Compa-ratio</Table.Th>
                      <Table.Th>Position</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {report.items.map((item) => (
                      <Table.Tr key={item.employeeId} {...rowLink(`/employees/${item.employeeId}`)}>
                        <Table.Td>
                          <Link to={`/employees/${item.employeeId}`}>
                            {item.firstName} {item.lastName}
                          </Link>
                        </Table.Td>
                        <Table.Td>{item.countryCode}</Table.Td>
                        <Table.Td>{item.levelCode}</Table.Td>
                        <Table.Td ta="right">{money(item.salary.usd)}</Table.Td>
                        <Table.Td ta="right">
                          {money(item.band.minUsd)} – {money(item.band.maxUsd)}
                        </Table.Td>
                        <Table.Td ta="right">{item.compaRatio.toFixed(2)}</Table.Td>
                        <Table.Td>
                          <BandBadge position={item.position} />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              <Group justify="space-between" mt="md" wrap="wrap">
                <Text size="sm" c="dimmed">
                  Showing {firstRow.toLocaleString("en-US")}–
                  {(firstRow + report.items.length - 1).toLocaleString("en-US")} of{" "}
                  {report.total.toLocaleString("en-US")}
                </Text>
                {totalPages > 1 && (
                  <Pagination
                    total={totalPages}
                    value={page}
                    onChange={setPage}
                    size="sm"
                    aria-label="Out-of-band pages"
                  />
                )}
              </Group>
            </>
          )}
        </>
      )}
    </Card>
  );
});

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof IconUsers;
}): React.JSX.Element {
  return (
    <Card padding="md" role="group" aria-label={label}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: "0.04em" }}>
          {label}
        </Text>
        <ThemeIcon variant="light" radius="md" size="md" aria-hidden="true">
          <Icon size={16} stroke={1.7} />
        </ThemeIcon>
      </Group>
      <Box mt={4}>
        <Text fz={22} fw={700} lh={1.3}>
          {value}
        </Text>
      </Box>
    </Card>
  );
}
