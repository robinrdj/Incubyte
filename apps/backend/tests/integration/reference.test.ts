import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { AUTH_HEADER, createTestApp, createTestClient, resetDatabase } from "./helpers.js";

let prisma: PrismaClient;
let app: ReturnType<typeof createTestApp>;

beforeAll(() => {
  prisma = createTestClient();
  app = createTestApp(prisma);
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
