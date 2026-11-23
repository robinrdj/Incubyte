import { fail, ok, type Result } from "./result.js";

/**
 * Parses RFC 4180-style CSV: quoted fields, doubled quotes inside quoted fields, embedded commas
 * and newlines, and CRLF or LF line endings. A leading byte-order mark is ignored.
 * Blank trailing lines are dropped.
 */
export function parseCsv(text: string): Result<string[][]> {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const endField = (): void => {
    record.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRecord = (): void => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input.charAt(i);

    if (inQuotes) {
      if (char === '"') {
        if (input.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\r") {
      if (input.charAt(i + 1) === "\n") {
        i += 1;
      }
      endRecord();
    } else if (char === "\n") {
      endRecord();
    } else {
      field += char;
      fieldStarted = true;
    }
  }

  if (inQuotes) {
    return fail("the file ends inside a quoted field");
  }
  if (field !== "" || record.length > 0) {
    endRecord();
  }
  return ok(records.filter((r) => !(r.length === 1 && r[0] === "")));
}

/** Characters that make spreadsheet software treat a cell as a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Formats rows as CSV with CRLF line endings, which spreadsheet software expects.
 * Text cells that start with a formula character are prefixed with an apostrophe, so an exported
 * name such as "=HYPERLINK(...)" cannot run when the file is opened in a spreadsheet.
 */
export function formatCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((cells) => cells.map(escapeCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

function escapeCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
