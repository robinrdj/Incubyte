import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { createApp } from "../src/http/app.js";
import { AnalyticsService } from "../src/services/analytics-service.js";
import { BulkExchangeService } from "../src/services/bulk-exchange-service.js";
import { EmployeeService } from "../src/services/employee-service.js";
import { SettingsService } from "../src/services/settings-service.js";
import { AUTH_HEADER, FIXED_NOW, TEST_CREDENTIALS, createTestClient } from "./helpers.js";

const WEB_APP = "https://salary.example.test";

let prisma: PrismaClient;

function appWith(corsOrigins: readonly string[]) {
  return createApp({
    service: new EmployeeService(prisma, () => FIXED_NOW),
    analytics: new AnalyticsService(prisma, () => FIXED_NOW),
    bulk: new BulkExchangeService(prisma, () => FIXED_NOW),
    settings: new SettingsService(prisma),
    credentials: TEST_CREDENTIALS,
    corsOrigins,
  });
}

beforeAll(() => {
  prisma = createTestClient();
});
afterAll(() => prisma.$disconnect());

describe("calls from the hosted web app (CORS)", () => {
  it("answers the browser's preflight for the allowed web app, before authentication", async () => {
    const response = await request(appWith([WEB_APP]))
      .options("/api/employees")
      .set("Origin", WEB_APP)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization,x-requested-with");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_APP);
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
  });

  it("lets the allowed web app read responses", async () => {
    const response = await request(appWith([WEB_APP]))
      .get("/api/reference")
      .set("Origin", WEB_APP)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_APP);
  });

  it("does not grant access to any other site", async () => {
    const response = await request(appWith([WEB_APP]))
      .options("/api/employees")
      .set("Origin", "https://evil.example.test")
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("sends no CORS headers when no web app is configured", async () => {
    const response = await request(appWith([])).get("/health").set("Origin", WEB_APP);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("a rejected sign-in", () => {
  it("has no Basic challenge for the web app, so the browser shows no dialog of its own", async () => {
    const response = await request(appWith([]))
      .get("/api/reference")
      .set("X-Requested-With", "XMLHttpRequest");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toBeUndefined();
  });

  it("keeps the standard challenge for other clients, such as curl", async () => {
    const response = await request(appWith([])).get("/api/reference");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toBe('Basic realm="salary-management"');
  });
});
