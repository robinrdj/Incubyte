import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const VALID = {
  DATABASE_URL: "postgres://localhost/salary",
  HR_EMAIL: "hr.manager@acme.test",
  HR_PASSWORD: "a-long-enough-password",
};

describe("loadConfig", () => {
  it("accepts a valid configuration and defaults the port", () => {
    expect(loadConfig(VALID)).toMatchObject({ HR_EMAIL: "hr.manager@acme.test", PORT: 4000 });
  });

  it("stores the sign-in email in lower case, as the web app sends it", () => {
    expect(loadConfig({ ...VALID, HR_EMAIL: " HR.Manager@ACME.test " }).HR_EMAIL).toBe(
      "hr.manager@acme.test",
    );
  });

  it("refuses a sign-in that is not an email", () => {
    expect(() => loadConfig({ ...VALID, HR_EMAIL: "hr" })).toThrow(/HR_EMAIL/);
  });

  it("refuses a short password", () => {
    expect(() => loadConfig({ ...VALID, HR_PASSWORD: "short" })).toThrow(/HR_PASSWORD/);
  });
});
