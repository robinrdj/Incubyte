import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { AnalyticsService } from "../src/services/analytics-service.js";
import { BulkExchangeService } from "../src/services/bulk-exchange-service.js";
import { EmployeeService } from "../src/services/employee-service.js";
import {
  AUTH_HEADER,
  FIXED_NOW,
  TEST_CREDENTIALS,
  createTestClient,
  resetDatabase,
} from "./helpers.js";

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  prisma = createTestClient();
  app = createApp({
    service: new EmployeeService(prisma, () => FIXED_NOW),
    analytics: new AnalyticsService(prisma, () => FIXED_NOW),
    bulk: new BulkExchangeService(prisma, () => FIXED_NOW),
    credentials: TEST_CREDENTIALS,
  });
});

beforeEach(() => resetDatabase(prisma));
afterAll(() => prisma.$disconnect());

describe("GET /api/reference", () => {
  it("returns countries, departments, and levels for the pickers", async () => {
    const response = await request(app).get("/api/reference").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.countries).toEqual([
      { code: "DE", name: "Germany", currency: "EUR" },
      { code: "IN", name: "India", currency: "INR" },
    ]);
    expect(response.body.departments.map((d: { name: string }) => d.name)).toEqual([
      "Engineering",
      "Finance",
    ]);
    expect(response.body.levels.map((l: { code: string }) => l.code)).toEqual(["L1", "L2", "L3"]);
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/api/reference")).status).toBe(401);
  });
});
