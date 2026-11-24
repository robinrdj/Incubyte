import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { AUTH_HEADER, createTestApp, createTestClient, resetDatabase } from "./helpers.js";

const WEB_APP = "https://salary.example.test";

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createTestClient();
});
beforeEach(() => resetDatabase(prisma));
afterAll(() => prisma.$disconnect());

describe("calls from the hosted web app (CORS)", () => {
  it("answers the browser's preflight for the allowed web app, before authentication", async () => {
    const response = await request(createTestApp(prisma, [WEB_APP]))
      .options("/api/employees")
      .set("Origin", WEB_APP)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_APP);
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
  });

  it("lets the allowed web app read responses", async () => {
    const response = await request(createTestApp(prisma, [WEB_APP]))
      .get("/api/reference")
      .set("Origin", WEB_APP)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_APP);
  });

  it("does not grant access to any other site", async () => {
    const response = await request(createTestApp(prisma, [WEB_APP]))
      .options("/api/employees")
      .set("Origin", "https://evil.example.test")
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("sends no CORS headers when no web app is configured", async () => {
    const response = await request(createTestApp(prisma)).get("/health").set("Origin", WEB_APP);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
