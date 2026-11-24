import type { BandViolationReportDto, CompensationReportDto } from "@salary/shared";
import { describe, expect, it } from "vitest";
import { bandViolationsToCsv, compensationToCsv } from "../../../src/domain/analytics-csv.js";

const summary = (headcount: number, median: string | null) => ({
  headcount,
  medianUsd: median,
  averageUsd: median,
  minUsd: median,
  maxUsd: median,
});

const lines = (csv: string): string[] => csv.trim().split("\r\n");

describe("compensationToCsv", () => {
  const report: CompensationReportDto = {
    asOf: "2026-11-23",
    currency: "USD",
    groupBy: "country",
    overall: summary(3, "100000.00"),
    excludedWithoutSalary: 0,
    excludedLeaving: 0,
    groups: [
      { key: "1", label: "Germany", summary: summary(2, "110000.00") },
      { key: "2", label: "India", summary: summary(1, "30000.00") },
    ],
  };

  it("names the first column after the grouping and puts the company-wide row first", () => {
    expect(lines(compensationToCsv(report))).toEqual([
      "country,headcount,medianUsd,averageUsd,minUsd,maxUsd",
      "All active employees,3,100000.00,100000.00,100000.00,100000.00",
      "Germany,2,110000.00,110000.00,110000.00,110000.00",
      "India,1,30000.00,30000.00,30000.00,30000.00",
    ]);
  });

  it("leaves amounts empty for a group with no employees", () => {
    const empty = { ...report, groups: [{ key: "3", label: "Brazil", summary: summary(0, null) }] };
    expect(lines(compensationToCsv(empty))[2]).toBe("Brazil,0,,,,");
  });

  it("guards a label that a spreadsheet would treat as a formula", () => {
    const risky = {
      ...report,
      groups: [{ key: "4", label: "=HYPERLINK(1)", summary: summary(1, "1.00") }],
    };
    expect(lines(compensationToCsv(risky))[2]?.startsWith("'=HYPERLINK(1)")).toBe(true);
  });
});

describe("bandViolationsToCsv", () => {
  const report: BandViolationReportDto = {
    asOf: "2026-11-23",
    currency: "USD",
    evaluated: 2,
    withoutBand: 0,
    below: 1,
    above: 0,
    total: 1,
    page: 1,
    pageSize: 1,
    items: [
      {
        employeeId: "00000000-0000-4000-8000-000000000005",
        employeeCode: "EMP-000005",
        firstName: "Esha",
        lastName: "E",
        countryCode: "IN",
        departmentName: "Engineering",
        levelCode: "L3",
        salary: { amount: "1800000.00", currency: "INR", usd: "21600.00" },
        band: { minUsd: "24000.00", maxUsd: "36000.00" },
        position: "BELOW",
        compaRatio: 0.72,
      },
    ],
  };

  it("writes one row per person with local and USD amounts", () => {
    expect(lines(bandViolationsToCsv(report))).toEqual([
      "employeeCode,firstName,lastName,countryCode,departmentName,levelCode,salaryAmount,salaryCurrency,salaryUsd,bandMinUsd,bandMaxUsd,compaRatio,position",
      "EMP-000005,Esha,E,IN,Engineering,L3,1800000.00,INR,21600.00,24000.00,36000.00,0.72,BELOW",
    ]);
  });
});
