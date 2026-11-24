import {
  Alert,
  Badge,
  Card,
  Group,
  Pagination,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { memo, useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { ExportCsvButton } from "../ExportCsvButton.js";
import { BandViolationsTable } from "./BandViolationsTable.js";
import { useAsync } from "../../hooks/useAsync.js";
import { errorMessage } from "../../lib/errors.js";

export const BAND_PAGE_SIZE = 25;

type PositionFilter = "ALL" | "BELOW" | "ABOVE";

/** Server-paged list; memoised so a grouping change does not re-render it. */
export const BandViolationsCard = memo(function BandViolationsCard({
  asOf,
}: {
  asOf: string;
}): React.JSX.Element {
  const { api } = useAuth();
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
          <Group gap="sm" wrap="wrap">
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
            <ExportCsvButton
              filename={`pay-band-${filter === "ALL" ? "outside" : filter.toLowerCase()}-${report.asOf}.csv`}
              load={() =>
                api.bandViolationsCsv({
                  asOf: report.asOf,
                  ...(filter === "ALL" ? {} : { position: filter }),
                })
              }
            />
          </Group>
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
              <BandViolationsTable items={report.items} refreshing={refreshing} />
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
