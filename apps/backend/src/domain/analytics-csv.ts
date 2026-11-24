import type { BandViolationReportDto, CompensationReportDto, SummaryDto } from "@salary/shared";
import { formatCsv } from "./csv.js";

const summaryCells = (summary: SummaryDto): string[] => [
  String(summary.headcount),
  summary.medianUsd ?? "",
  summary.averageUsd ?? "",
  summary.minUsd ?? "",
  summary.maxUsd ?? "",
];

/** Company-wide row first; amounts in USD. */
export function compensationToCsv(report: CompensationReportDto): string {
  const header = [report.groupBy, "headcount", "medianUsd", "averageUsd", "minUsd", "maxUsd"];
  const rows = [
    ["All active employees", ...summaryCells(report.overall)],
    ...report.groups.map((group) => [group.label, ...summaryCells(group.summary)]),
  ];
  return formatCsv(header, rows);
}

export function bandViolationsToCsv(report: BandViolationReportDto): string {
  const header = [
    "employeeCode",
    "firstName",
    "lastName",
    "countryCode",
    "departmentName",
    "levelCode",
    "salaryAmount",
    "salaryCurrency",
    "salaryUsd",
    "bandMinUsd",
    "bandMaxUsd",
    "compaRatio",
    "position",
  ];
  const rows = report.items.map((item) => [
    item.employeeCode,
    item.firstName,
    item.lastName,
    item.countryCode,
    item.departmentName,
    item.levelCode,
    item.salary.amount,
    item.salary.currency,
    item.salary.usd,
    item.band.minUsd,
    item.band.maxUsd,
    item.compaRatio.toFixed(2),
    item.position,
  ]);
  return formatCsv(header, rows);
}
