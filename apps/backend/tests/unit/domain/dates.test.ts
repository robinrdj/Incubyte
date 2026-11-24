import { describe, expect, it } from "vitest";
import { latestToday } from "../../../src/domain/dates.js";

describe("latestToday", () => {
  it("is already tomorrow (UTC) once UTC+14 has passed midnight", () => {
    expect(latestToday(new Date("2026-11-24T20:11:00Z"))).toBe("2026-11-25");
  });

  it("is the UTC date while UTC+14 is still on the same day", () => {
    expect(latestToday(new Date("2026-11-24T09:59:00Z"))).toBe("2026-11-24");
  });
});
