import {
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { EmploymentStatus, ReferenceDataDto } from "@salary/shared";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";

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

/** How many filters other than search are set, for the button's badge. */
function activeFilterCount(criteria: DirectoryCriteria): number {
  return (
    (criteria.countryCodes.length > 0 ? 1 : 0) +
    (criteria.departmentNames.length > 0 ? 1 : 0) +
    (criteria.levelCodes.length > 0 ? 1 : 0) +
    (criteria.status === null ? 0 : 1)
  );
}

export function DirectoryFilters({
  criteria,
  reference,
  onChange,
}: {
  criteria: DirectoryCriteria;
  reference: ReferenceDataDto | undefined;
  onChange: (change: Partial<DirectoryCriteria>) => void;
}): React.JSX.Element {
  const [opened, { open, close }] = useDisclosure(false);
  const active = activeFilterCount(criteria);

  return (
    <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Group gap="sm" wrap="nowrap">
        <TextInput
          aria-label="Search"
          placeholder="Search by name, email, or employee code"
          leftSection={<IconSearch size={16} />}
          value={criteria.search}
          onChange={(event) => {
            onChange({ search: event.currentTarget.value });
          }}
          style={{ flex: 1 }}
        />
        <Button
          variant={active > 0 ? "light" : "default"}
          leftSection={<IconAdjustmentsHorizontal size={16} />}
          rightSection={
            active > 0 ? (
              <Badge size="sm" circle>
                {active}
              </Badge>
            ) : undefined
          }
          onClick={open}
          aria-label={active > 0 ? `Filters, ${String(active)} active` : "Filters"}
        >
          Filters
        </Button>
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="sm"
        title={<Text fw={700}>Filters</Text>}
        padding="lg"
      >
        <Stack gap="md">
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
          <Group justify="space-between" mt="md">
            <Button
              variant="subtle"
              color="gray"
              disabled={active === 0}
              onClick={() => {
                onChange({ countryCodes: [], departmentNames: [], levelCodes: [], status: null });
              }}
            >
              Clear all
            </Button>
            <Button onClick={close}>Done</Button>
          </Group>
        </Stack>
      </Drawer>
    </Box>
  );
}
