import { Alert, Button, Card, Stack } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconPlus, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import type { EmployeeListQuery } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import {
  DirectoryFilters,
  NO_CRITERIA,
  type DirectoryCriteria,
} from "../components/employees/DirectoryFilters.js";
import { DirectoryFooter, DirectoryToolbar } from "../components/employees/DirectoryToolbar.js";
import { EmployeeResults } from "../components/employees/EmployeeResults.js";
import { ExportCsvButton } from "../components/ExportCsvButton.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAsync } from "../hooks/useAsync.js";
import { useDirectoryView } from "../hooks/useDirectoryView.js";
import { usePageBands } from "../hooks/usePageBands.js";

export const PAGE_SIZE = 25;

type EmployeeFilters = Omit<EmployeeListQuery, "page" | "pageSize">;

function toFilters(criteria: DirectoryCriteria, search: string): EmployeeFilters {
  const { countryCodes, departmentNames, levelCodes, status } = criteria;
  return {
    ...(search === "" ? {} : { search }),
    ...(countryCodes.length === 0 ? {} : { countryCode: countryCodes }),
    ...(departmentNames.length === 0 ? {} : { departmentName: departmentNames }),
    ...(levelCodes.length === 0 ? {} : { levelCode: levelCodes }),
    ...(status === null ? {} : { status }),
  };
}

export function DirectoryPage(): React.JSX.Element {
  const { api } = useAuth();
  const [criteria, setCriteria] = useState<DirectoryCriteria>(NO_CRITERIA);
  const [debouncedSearch] = useDebouncedValue(criteria.search, 300);
  const [page, setPage] = useState(1);
  const [view, chooseView] = useDirectoryView();

  const reference = useAsync(() => api.reference(), []);
  const filters = toFilters(criteria, debouncedSearch);
  const directory = useAsync(
    (query: EmployeeFilters, pageNumber: number) =>
      api.listEmployees({ ...query, page: pageNumber, pageSize: PAGE_SIZE }),
    [filters, page],
  );

  const employees = directory.data?.items ?? [];
  const total = directory.data?.total ?? 0;
  const bands = usePageBands(employees);

  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconUsers}
        title="Employees"
        description="Everyone on the payroll, with their current salary and pay band."
        actions={
          <>
            <ExportCsvButton
              size="sm"
              filename="employees.csv"
              disabled={total === 0}
              load={() => api.exportCsv(filters)}
            />
            <Button component={Link} to="/employees/new" leftSection={<IconPlus size={16} />}>
              Add employee
            </Button>
          </>
        }
      />

      <Card padding={0}>
        <DirectoryFilters
          criteria={criteria}
          reference={reference.data}
          onChange={(change) => {
            setCriteria((current) => ({ ...current, ...change }));
            setPage(1);
          }}
        />

        {directory.error !== null && (
          <Alert color="red" role="alert" variant="light" m="md">
            The employees could not be loaded. Try again.
          </Alert>
        )}

        {total > 0 && (
          <DirectoryToolbar
            total={total}
            statusCounts={directory.data?.statusCounts}
            view={view}
            onViewChange={chooseView}
          />
        )}

        <EmployeeResults
          view={view}
          loading={directory.loading && directory.data === undefined}
          refreshing={directory.loading && directory.data !== undefined}
          employees={employees}
          bandFor={bands.bandFor}
          bandsLoading={bands.loading}
        />

        {total > 0 && (
          <DirectoryFooter page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </Card>
    </Stack>
  );
}
