import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type RecordedRequest } from "../support/fake-api.js";
import { REFERENCE, renderAt, signedIn } from "../support/render.js";
import { readFileText } from "../../src/lib/files.js";
import { DataExchangePage } from "../../src/pages/DataExchangePage.js";

const CSV_FILE = "employeeCode,firstName\r\nEMP-000001,Ada\r\n";

const REPORT = {
  dryRun: true,
  totalRows: 3,
  created: 2,
  updated: 0,
  unchanged: 0,
  rejected: 1,
  errors: [
    { line: 4, email: "bad@acme.test", messages: ['countryCode "FR" is not a known country'] },
  ],
};

let recorded: RecordedRequest[];
let createObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.sessionStorage.clear();
  signedIn();
  createObjectURL = vi.fn(() => "blob:test");
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  recorded = installFakeApi([
    { method: "GET", path: "/api/reference", body: REFERENCE },
    { method: "GET", path: "/api/employees/export.csv", body: "employeeCode\r\nEMP-000001\r\n" },
    { method: "POST", path: "/api/employees/import", body: REPORT },
  ]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function readFileBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("The file could not be read."));
    };
    reader.readAsArrayBuffer(blob);
  });
}

function uploadCsv(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error("file input not found");
  return user.upload(input, new File([text], "employees.csv", { type: "text/csv" }));
}

describe("export", () => {
  it("downloads employees as CSV", async () => {
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);

    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });
    expect(recorded.some((r) => r.url === "/api/employees/export.csv")).toBe(true);
  });

  it("exports only the employees matching the chosen status", async () => {
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);

    await user.click(screen.getByRole("combobox", { name: /^status/i }));
    await user.click(await screen.findByText("Leaving"));
    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => {
      expect(recorded.some((r) => r.url === "/api/employees/export.csv?status=LEAVING")).toBe(true);
    });
  });

  it("offers a blank template with the exact import columns", async () => {
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);

    await user.click(screen.getByRole("button", { name: "Download blank template" }));

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    // Text decoding drops a leading byte-order mark, so check the raw bytes for it.
    const bytes = new Uint8Array(await readFileBytes(blob));
    expect([...bytes.slice(0, 3)], "starts with a UTF-8 byte-order mark for Excel").toEqual([
      0xef, 0xbb, 0xbf,
    ]);
    const text = await readFileText(blob);
    expect(text.trim()).toBe(
      "employeeCode,firstName,lastName,email,jobTitle,countryCode,departmentName,levelCode,startDate,status,salaryAmount,salaryCurrency,salaryEffectiveFrom",
    );
  });
});

describe("import", () => {
  it("keeps the import button disabled until the file has been checked", () => {
    renderAt("/data-exchange", <DataExchangePage />);

    expect(screen.getByRole("button", { name: /^import/i })).toBeDisabled();
  });

  it("checks the file without saving and shows the rows that would fail", async () => {
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);
    await uploadCsv(user, CSV_FILE);

    await user.click(screen.getByRole("button", { name: "Check file" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "3 row(s): 2 to create, 0 to update, 0 unchanged, 1 rejected.",
    );
    expect(screen.getByText("Check result (nothing has been saved yet)")).toBeInTheDocument();

    const errors = screen.getByRole("table", { name: "Rows with errors" });
    expect(within(errors).getByText("4")).toBeInTheDocument();
    expect(within(errors).getByText('countryCode "FR" is not a known country')).toBeInTheDocument();

    const check = recorded.find((r) => r.method === "POST");
    expect(check?.url).toBe("/api/employees/import?dryRun=true");
    expect(check?.body).toBe(CSV_FILE);
  });

  it("applies the file after a successful check", async () => {
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);
    await uploadCsv(user, CSV_FILE);
    await user.click(screen.getByRole("button", { name: "Check file" }));
    await screen.findByRole("status");

    await user.click(screen.getByRole("button", { name: "Import 2 change(s)" }));

    expect(await screen.findByText("Import complete")).toBeInTheDocument();
    const applied = recorded.filter((r) => r.method === "POST").at(-1);
    expect(applied?.url).toBe("/api/employees/import");
  });

  it("explains a file the API cannot read, such as a misspelled column", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      {
        method: "POST",
        path: "/api/employees/import",
        status: 422,
        body: {
          error: { code: "INVALID_FILE", message: "unknown column(s): salary_amount" },
        },
      },
    ]);
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);
    await uploadCsv(user, "employeeCode,salary_amount\r\nEMP-000001,1\r\n");

    await user.click(screen.getByRole("button", { name: "Check file" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("unknown column(s): salary_amount");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not offer to import when nothing would change", async () => {
    recorded = installFakeApi([
      { method: "GET", path: "/api/reference", body: REFERENCE },
      {
        method: "POST",
        path: "/api/employees/import",
        body: { ...REPORT, created: 0, rejected: 0, unchanged: 3, errors: [] },
      },
    ]);
    const user = userEvent.setup();
    renderAt("/data-exchange", <DataExchangePage />);
    await uploadCsv(user, CSV_FILE);
    await user.click(screen.getByRole("button", { name: "Check file" }));
    await screen.findByRole("status");

    expect(screen.getByRole("button", { name: "Import 0 change(s)" })).toBeDisabled();
  });
});
