import { describe, expect, it } from "vitest";
import { adminDatabaseUrl } from "../../../src/db/urls.js";

describe("adminDatabaseUrl", () => {
  it("prefers the direct connection string when there is one", () => {
    expect(
      adminDatabaseUrl({
        DATABASE_URL: "postgres://pooled",
        DIRECT_DATABASE_URL: "postgres://direct",
      }),
    ).toBe("postgres://direct");
  });

  it("falls back to DATABASE_URL, as in local development", () => {
    expect(adminDatabaseUrl({ DATABASE_URL: "postgres://local" })).toBe("postgres://local");
  });

  it("explains what to set when neither is present", () => {
    expect(() => adminDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });
});
