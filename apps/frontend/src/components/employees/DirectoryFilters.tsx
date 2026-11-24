import { Box, MultiSelect, Select, SimpleGrid, TextInput } from "@mantine/core";
import type { EmploymentStatus, ReferenceDataDto } from "@salary/shared";
import { IconSearch } from "@tabler/icons-react";

export interface DirectoryCriteria {
  search: string;
  countryCodes: string[];
  departmentNames: string[];
  levelCodes: string[];
  status: EmploymentStatus | null;
}

export const NO_CRITERIA: DirectoryCriteria = {
  search: "",
  countryCodes: [],
  departmentNames: [],
  levelCodes: [],
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
        <MultiSelect
          label="Country"
          placeholder={criteria.countryCodes.length === 0 ? "All countries" : undefined}
          data={(reference?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
          value={criteria.countryCodes}
          onChange={(values) => {
            onChange({ countryCodes: values });
          }}
          clearable
          searchable
          hidePickedOptions
          maxValues={20}
        />
        <MultiSelect
          label="Department"
          placeholder={criteria.departmentNames.length === 0 ? "All departments" : undefined}
          data={(reference?.departments ?? []).map((d) => d.name)}
          value={criteria.departmentNames}
          onChange={(values) => {
            onChange({ departmentNames: values });
          }}
          clearable
          searchable
          hidePickedOptions
        />
        <MultiSelect
          label="Level"
          placeholder={criteria.levelCodes.length === 0 ? "All levels" : undefined}
          data={(reference?.levels ?? []).map((l) => l.code)}
          value={criteria.levelCodes}
          onChange={(values) => {
            onChange({ levelCodes: values });
          }}
          clearable
          hidePickedOptions
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
