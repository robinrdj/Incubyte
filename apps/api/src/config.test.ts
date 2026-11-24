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

describe("CORS_ORIGIN", () => {
  it("allows no other origins when unset, as in development through the proxy", () => {
    expect(loadConfig(VALID).CORS_ORIGIN).toEqual([]);
  });

  it("reads a comma-separated list and drops trailing slashes", () => {
    const config = loadConfig({
      ...VALID,
      CORS_ORIGIN: "https://salary.vercel.app/, https://preview.vercel.app",
    });
    expect(config.CORS_ORIGIN).toEqual(["https://salary.vercel.app", "https://preview.vercel.app"]);
  });

  it.each(["salary.vercel.app", "https://salary.vercel.app/employees", "*"])(
    "refuses %s, which is not a bare web address",
    (value) => {
      expect(() => loadConfig({ ...VALID, CORS_ORIGIN: value })).toThrow(/CORS_ORIGIN/);
    },
  );
});
