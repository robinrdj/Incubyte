import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartBar,
  IconMathAvg,
  IconUsers,
} from "@tabler/icons-react";
import type { GroupBy } from "@salary/shared";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.js";
import { BandBadge } from "../components/BandBadge.js";
import { MedianBars } from "../components/MedianBars.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";
import { formatMoney } from "../lib/format.js";

const GROUP_OPTIONS = [
  { value: "country", label: "Country" },
  { value: "department", label: "Department" },
  { value: "level", label: "Level" },
];

const money = (value: string | null): string => (value === null ? "—" : formatMoney(value, "USD"));

/** Compensation dashboard: overall figures, grouped breakdown, and employees outside their pay band. */
export function AnalyticsPage(): React.JSX.Element {
  const { api } = useAuth();
  const [groupBy, setGroupBy] = useState<GroupBy>("country");
  const [asOf, setAsOf] = useState("");

  const compensation = useAsync(
    (group: GroupBy, date: string) => api.compensation(group, date === "" ? undefined : date),
    [groupBy, asOf],
  );
  const bands = useAsync(
    (date: string) => api.bandViolations(date === "" ? undefined : date),
    [asOf],
  );

  return (
    <Stack>
      <Group justify="space-between" wrap="wrap" align="flex-end">
        <div>
          <Title order={2}>Analytics</Title>
          <Text c="dimmed" size="sm">
            Active employees, in US dollars at the exchange rate in force on the chosen date.
          </Text>
        </div>
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Group by"
            data={GROUP_OPTIONS}
            value={groupBy}
            onChange={(value) => {
              setGroupBy((value ?? "country") as GroupBy);
            }}
            allowDeselect={false}
            w={180}
          />
          <TextInput
            label="As of (optional)"
            type="date"
            value={asOf}
            onChange={(event) => {
              setAsOf(event.currentTarget.value);
            }}
            w={180}
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
        </Group>
      </Group>

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

      {compensation.data === undefined && compensation.loading ? (
        <Loader aria-label="Loading analytics" />
      ) : compensation.data !== undefined ? (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
            <Stat
              label="Headcount"
              value={compensation.data.overall.headcount.toLocaleString("en-US")}
              icon={IconUsers}
            />
            <Stat
              label="Median"
              value={money(compensation.data.overall.medianUsd)}
              icon={IconChartBar}
            />
            <Stat
              label="Average"
              value={money(compensation.data.overall.averageUsd)}
              icon={IconMathAvg}
            />
            <Stat
              label="Lowest"
              value={money(compensation.data.overall.minUsd)}
              icon={IconArrowDownRight}
            />
            <Stat
              label="Highest"
              value={money(compensation.data.overall.maxUsd)}
              icon={IconArrowUpRight}
            />
          </SimpleGrid>
          {compensation.data.excludedWithoutSalary > 0 && (
            <Text size="sm" c="dimmed">
              {compensation.data.excludedWithoutSalary} active employee(s) had no salary on this
              date and are not counted.
            </Text>
          )}

          <Card>
            <Title order={4} mb="md">
              Median pay by {groupBy}
            </Title>
            <MedianBars
              bars={compensation.data.groups.map((group) => ({
                label: group.label,
                medianUsd: group.summary.medianUsd,
              }))}
            />
            <Table.ScrollContainer minWidth={640} mt="md">
              <Table striped aria-label={`Compensation by ${groupBy}`}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Group</Table.Th>
                    <Table.Th>Headcount</Table.Th>
                    <Table.Th>Median</Table.Th>
                    <Table.Th>Average</Table.Th>
                    <Table.Th>Lowest</Table.Th>
                    <Table.Th>Highest</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {compensation.data.groups.map((group) => (
                    <Table.Tr key={group.key}>
                      <Table.Td>{group.label}</Table.Td>
                      <Table.Td>{group.summary.headcount}</Table.Td>
                      <Table.Td>{money(group.summary.medianUsd)}</Table.Td>
                      <Table.Td>{money(group.summary.averageUsd)}</Table.Td>
                      <Table.Td>{money(group.summary.minUsd)}</Table.Td>
                      <Table.Td>{money(group.summary.maxUsd)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </>
      ) : null}

      <Card>
        <Title order={4}>Pay bands</Title>
        {bands.error !== null && (
          <Alert color="red" role="alert" variant="light" mt="sm">
            {errorMessage(bands.error)}
          </Alert>
        )}
        {bands.data !== undefined && (
          <>
            <Text size="sm" c="dimmed" mt="xs" mb="md">
              {bands.data.evaluated} evaluated · {bands.data.items.length} outside their band ·{" "}
              {bands.data.withoutBand} without a band for their level and country
            </Text>
            {bands.data.items.length === 0 ? (
              <Text>Everyone evaluated is within their band.</Text>
            ) : (
              <Table.ScrollContainer minWidth={720}>
                <Table striped aria-label="Employees outside their pay band">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Country</Table.Th>
                      <Table.Th>Level</Table.Th>
                      <Table.Th>Salary (USD)</Table.Th>
                      <Table.Th>Band (USD)</Table.Th>
                      <Table.Th>Compa-ratio</Table.Th>
                      <Table.Th>Position</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {bands.data.items.map((item) => (
                      <Table.Tr key={item.employeeId}>
                        <Table.Td>
                          <Link to={`/employees/${item.employeeId}`}>
                            {item.firstName} {item.lastName}
                          </Link>
                        </Table.Td>
                        <Table.Td>{item.countryCode}</Table.Td>
                        <Table.Td>{item.levelCode}</Table.Td>
                        <Table.Td>{money(item.salary.usd)}</Table.Td>
                        <Table.Td>
                          {money(item.band.minUsd)} – {money(item.band.maxUsd)}
                        </Table.Td>
                        <Table.Td>{item.compaRatio.toFixed(2)}</Table.Td>
                        <Table.Td>
                          <BandBadge position={item.position} />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </>
        )}
        {bands.data === undefined && bands.loading && <Loader aria-label="Loading pay bands" />}
      </Card>
    </Stack>
  );
}

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
      <Text fz={22} fw={700} mt={4}>
        {value}
      </Text>
    </Card>
  );
}
