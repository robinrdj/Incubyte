import { describe, expect, it } from "vitest";
import { formatCsv, parseCsv } from "./csv.js";

describe("parseCsv", () => {
  it("parses simple rows with LF and CRLF endings", () => {
    expect(parseCsv("a,b\n1,2\r\n3,4\r\n")).toEqual({
      ok: true,
      value: [
        ["a", "b"],
        ["1", "2"],
        ["3", "4"],
      ],
    });
  });

  it("keeps commas, quotes, and newlines inside quoted fields", () => {
    const result = parseCsv('name,note\r\n"Lovelace, Ada","said ""hello""\nthen left"\r\n');
    expect(result).toEqual({
      ok: true,
      value: [
        ["name", "note"],
        ["Lovelace, Ada", 'said "hello"\nthen left'],
      ],
    });
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a,,c\n,,\n")).toEqual({
      ok: true,
      value: [
        ["a", "", "c"],
        ["", "", ""],
      ],
    });
  });

  it("ignores a leading byte-order mark and blank trailing lines", () => {
    expect(parseCsv("﻿a,b\n1,2\n\n\n")).toEqual({
      ok: true,
      value: [
        ["a", "b"],
        ["1", "2"],
      ],
    });
  });

  it("reports an unterminated quoted field", () => {
    const result = parseCsv('a,"unclosed\n1,2');
    expect(result.ok).toBe(false);
  });

  it("returns no records for empty input", () => {
    expect(parseCsv("")).toEqual({ ok: true, value: [] });
  });
});

describe("formatCsv", () => {
  it("uses CRLF line endings and a trailing newline", () => {
    expect(formatCsv(["a", "b"], [["1", "2"]])).toBe("a,b\r\n1,2\r\n");
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    expect(formatCsv(["name"], [['Lovelace, "Ada"']])).toBe('name\r\n"Lovelace, ""Ada"""\r\n');
  });

  it("neutralizes spreadsheet formulas so exported names cannot execute", () => {
    const output = formatCsv(["name"], [['=HYPERLINK("http://x")'], ["+1"], ["-2"], ["@sum"]]);
    expect(output).toContain("'=HYPERLINK");
    expect(output).toContain("'+1");
    expect(output).toContain("'-2");
    expect(output).toContain("'@sum");
  });

  it("round-trips through parseCsv for values that need no neutralizing", () => {
    const header = ["a", "b"];
    const rows = [
      ["plain", 'has, comma and "quote"'],
      ["multi\nline", ""],
    ];
    expect(parseCsv(formatCsv(header, rows))).toEqual({ ok: true, value: [header, ...rows] });
  });
});
