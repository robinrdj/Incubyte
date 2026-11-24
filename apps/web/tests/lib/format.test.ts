import { describe, expect, it } from "vitest";
import { bandLabel, formatDate, formatMoney } from "../../src/lib/format.js";
import { errorMessage } from "../../src/lib/errors.js";
import { ApiError } from "../../src/api/client.js";

describe("formatMoney", () => {
  it("shows the currency with thousands separators and two decimals", () => {
    expect(formatMoney("90000.00", "EUR")).toBe("€90,000.00");
    expect(formatMoney("1234.5", "USD")).toBe("$1,234.50");
  });

  it("does not round stored values", () => {
    expect(formatMoney("100.01", "GBP")).toContain("100.01");
  });

  it("falls back to the raw text for a value it cannot read", () => {
    expect(formatMoney("not-a-number", "EUR")).toBe("not-a-number EUR");
  });
});

describe("formatDate", () => {
  it("formats a stored date unambiguously", () => {
    expect(formatDate("2025-01-15")).toBe("15 Jan 2025");
  });

  it("returns the input for a value that is not a date", () => {
    expect(formatDate("soon")).toBe("soon");
  });
});

describe("bandLabel", () => {
  it("names the band position", () => {
    expect(bandLabel("ABOVE")).toBe("Above band");
    expect(bandLabel("BELOW")).toBe("Below band");
  });
});

describe("errorMessage", () => {
  it("lists each field from a validation failure", () => {
    const error = new ApiError(400, "VALIDATION_FAILED", "The request is invalid", [
      { field: "salary.amount", message: "must be a positive amount" },
      { field: "email", message: "must be a valid email address" },
    ]);
    expect(errorMessage(error)).toBe(
      "salary.amount must be a positive amount; email must be a valid email address",
    );
  });

  it("uses the server's message for other API errors", () => {
    expect(
      errorMessage(new ApiError(409, "CONFLICT", "An employee with this email already exists")),
    ).toBe("An employee with this email already exists");
  });

  it("gives a generic message for anything else", () => {
    expect(errorMessage(new Error("socket hang up"))).toBe("Something went wrong. Try again.");
  });
});
