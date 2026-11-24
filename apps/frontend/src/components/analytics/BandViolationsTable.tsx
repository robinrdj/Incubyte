import { Table } from "@mantine/core";
import type { BandViolationDto } from "@salary/shared";
import { Link } from "react-router";
import { useRowLink } from "../../hooks/useRowLink.js";
import { formatUsd } from "../../lib/format.js";
import { BandBadge } from "../BandBadge.js";

export function BandViolationsTable({
  items,
  refreshing,
}: {
  items: BandViolationDto[];
  refreshing: boolean;
}): React.JSX.Element {
  const rowLink = useRowLink();

  return (
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
          {items.map((item) => (
            <Table.Tr key={item.employeeId} {...rowLink(`/employees/${item.employeeId}`)}>
              <Table.Td>
                <Link to={`/employees/${item.employeeId}`}>
                  {item.firstName} {item.lastName}
                </Link>
              </Table.Td>
              <Table.Td>{item.countryCode}</Table.Td>
              <Table.Td>{item.levelCode}</Table.Td>
              <Table.Td ta="right">{formatUsd(item.salary.usd)}</Table.Td>
              <Table.Td ta="right">
                {formatUsd(item.band.minUsd)} – {formatUsd(item.band.maxUsd)}
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
  );
}
