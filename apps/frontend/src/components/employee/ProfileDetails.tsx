import { SimpleGrid, Text } from "@mantine/core";
import type { EmployeeDto } from "@salary/shared";
import { formatDate } from "../../lib/format.js";

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text>{value}</Text>
    </div>
  );
}

export function ProfileDetails({ employee }: { employee: EmployeeDto }): React.JSX.Element {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Detail label="Email" value={employee.email} />
      <Detail label="Job title" value={employee.jobTitle} />
      <Detail label="Country" value={employee.country.name} />
      <Detail label="Department" value={employee.department.name} />
      <Detail label="Level" value={employee.level.code} />
      <Detail label="Start date" value={formatDate(employee.startDate)} />
      <Detail label="Status" value={employee.status === "ACTIVE" ? "Active" : "Leaving"} />
    </SimpleGrid>
  );
}
