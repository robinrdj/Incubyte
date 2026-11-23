import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./money.js";

describe("parseMoney", () => {
  it.each([
    ["1", 100],
    ["1.5", 150],
    ["123456.78", 12345678],
    ["0.01", 1],
    ["  90000.00  ", 9000000],
  ])("parses %s as %i minor units", (input, expected) => {
    expect(parseMoney(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ["", "not a valid amount"],
    ["abc", "not a valid amount"],
    ["-5", "not a valid amount"],
    ["1.234", "not a valid amount"],
    ["1,000", "not a valid amount"],
    ["0", "greater than zero"],
    ["0.00", "greater than zero"],
  ])("rejects %j", (input, reason) => {
    const result = parseMoney(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(reason);
    }
  });

  it("rejects amounts too large to represent exactly", () => {
    const result = parseMoney("99999999999999999999.99");
    expect(result.ok).toBe(false);
  });
});

describe("formatMoney", () => {
  it("formats minor units with two decimals", () => {
    expect(formatMoney(12345678)).toBe("123456.78");
    expect(formatMoney(1)).toBe("0.01");
    expect(formatMoney(100)).toBe("1.00");
  });

  it("round-trips with parseMoney", () => {
    const parsed = parseMoney("4321.05");
    expect(parsed.ok && formatMoney(parsed.value)).toBe("4321.05");
  });
});
