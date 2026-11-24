import { Box, Select, SimpleGrid, TextInput } from "@mantine/core";
import type { EmploymentStatus, ReferenceDataDto } from "@salary/shared";
import { IconSearch } from "@tabler/icons-react";

export interface DirectoryCriteria {
  search: string;
  countryCode: string | null;
  departmentName: string | null;
  levelCode: string | null;
  status: EmploymentStatus | null;
}

export const NO_CRITERIA: DirectoryCriteria = {
  search: "",
  countryCode: null,
  departmentName: null,
  levelCode: null,
  status: null,
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "LEAVING", label: "Leaving" },
];

export function DirectoryFilters({
  criteria,
  reference,
  onChange,
}: {
  criteria: DirectoryCriteria;
  reference: ReferenceDataDto | undefined;
  onChange: (change: Partial<DirectoryCriteria>) => void;
}): React.JSX.Element {
  return (
    <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <TextInput
          label="Search"
          placeholder="Name, email, or code"
          leftSection={<IconSearch size={16} />}
          value={criteria.search}
          onChange={(event) => {
            onChange({ search: event.currentTarget.value });
          }}
        />
        <Select
          label="Country"
          placeholder="All countries"
          data={(reference?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
          value={criteria.countryCode}
          onChange={(value) => {
            onChange({ countryCode: value });
          }}
          clearable
          searchable
        />
        <Select
          label="Department"
          placeholder="All departments"
          data={(reference?.departments ?? []).map((d) => d.name)}
          value={criteria.departmentName}
          onChange={(value) => {
            onChange({ departmentName: value });
          }}
          clearable
        />
        <Select
          label="Level"
          placeholder="All levels"
          data={(reference?.levels ?? []).map((l) => l.code)}
          value={criteria.levelCode}
          onChange={(value) => {
            onChange({ levelCode: value });
          }}
          clearable
        />
        <Select
          label="Status"
          data={STATUS_OPTIONS}
          value={criteria.status ?? ""}
          onChange={(value) => {
            onChange({
              status: value === "" || value === null ? null : (value as EmploymentStatus),
            });
          }}
          allowDeselect={false}
        />
      </SimpleGrid>
    </Box>
  );
}
