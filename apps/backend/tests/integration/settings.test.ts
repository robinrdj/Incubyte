import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  AUTH_HEADER,
  createTestApp,
  createTestClient,
  employeeBody,
  resetDatabase,
} from "./helpers.js";

let prisma: PrismaClient;
let app: ReturnType<typeof createTestApp>;

beforeAll(() => {
  prisma = createTestClient();
  app = createTestApp(prisma);
});

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.fxRate.createMany({
    data: [
      { fromCurrency: "EUR", toCurrency: "USD", rate: "1.1", rateDate: new Date("2024-01-01") },
      { fromCurrency: "INR", toCurrency: "USD", rate: "0.012", rateDate: new Date("2024-01-01") },
    ],
  });
});
afterAll(() => prisma.$disconnect());

const get = (path: string) => request(app).get(path).set("Authorization", AUTH_HEADER);
const put = (path: string, body: object) =>
  request(app).put(path).set("Authorization", AUTH_HEADER).send(body);

async function medianUsdOn(asOf: string): Promise<string> {
  const response = await get(`/api/analytics/compensation?groupBy=country&asOf=${asOf}`);
  return response.body.overall.medianUsd as string;
}

describe("FX rate settings", () => {
  it("lists the stored rates against USD", async () => {
    const response = await get("/api/settings/fx-rates");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      reportingCurrency: "USD",
      items: [
        { currency: "EUR", rate: "1.10000000", rateDate: "2024-01-01" },
        { currency: "INR", rate: "0.01200000", rateDate: "2024-01-01" },
      ],
    });
  });

  it("adds a newer rate without changing figures for earlier dates", async () => {
    await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(employeeBody());

    const saved = await put("/api/settings/fx-rates", {
      currency: "eur",
      rate: "1.2",
      rateDate: "2026-01-01",
    });

    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ currency: "EUR", rate: "1.20000000", rateDate: "2026-01-01" });
    // 90,000 EUR at the old rate, then at the new one.
    expect(await medianUsdOn("2025-06-01")).toBe("99000.00");
    expect(await medianUsdOn("2026-06-01")).toBe("108000.00");
  });

  it("corrects the rate already stored for a date instead of adding a second one", async () => {
    await put("/api/settings/fx-rates", { currency: "EUR", rate: "1.15", rateDate: "2024-01-01" });

    const response = await get("/api/settings/fx-rates");
    const eur = (response.body.items as { currency: string }[]).filter((r) => r.currency === "EUR");
    expect(eur).toEqual([{ currency: "EUR", rate: "1.15000000", rateDate: "2024-01-01" }]);
  });

  it("refuses a rate for USD, which is always 1", async () => {
    const response = await put("/api/settings/fx-rates", {
      currency: "USD",
      rate: "1",
      rateDate: "2026-01-01",
    });

    expect(response.status).toBe(422);
  });

  it("refuses a currency no country uses", async () => {
    const response = await put("/api/settings/fx-rates", {
      currency: "JPY",
      rate: "0.0067",
      rateDate: "2026-01-01",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain("JPY");
  });

  it.each(["0", "-1.1", "abc", "1.123456789"])("rejects the rate %s", async (rate) => {
    const response = await put("/api/settings/fx-rates", {
      currency: "EUR",
      rate,
      rateDate: "2026-01-01",
    });

    expect(response.status).toBe(400);
  });
});

describe("pay band settings", () => {
  async function addBand(min: string, max: string): Promise<void> {
    const [de, l3] = await Promise.all([
      prisma.country.findUniqueOrThrow({ where: { code: "DE" } }),
      prisma.level.findUniqueOrThrow({ where: { code: "L3" } }),
    ]);
    await prisma.payBand.create({
      data: { countryId: de.id, levelId: l3.id, currency: "EUR", minAmount: min, maxAmount: max },
    });
  }

  it("lists bands in the country's currency", async () => {
    await addBand("80000", "100000");

    const response = await get("/api/settings/pay-bands");

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      {
        countryCode: "DE",
        levelCode: "L3",
        currency: "EUR",
        minAmount: "80000.00",
        maxAmount: "100000.00",
      },
    ]);
  });

  it("changes a band, and the band report uses the new range", async () => {
    await addBand("80000", "100000");
    await request(app)
      .post("/api/employees")
      .set("Authorization", AUTH_HEADER)
      .send(employeeBody());
    expect((await get("/api/analytics/band-violations")).body.items).toHaveLength(0);

    const saved = await put("/api/settings/pay-bands/de/l3", {
      minAmount: "95000",
      maxAmount: "120000",
    });

    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ minAmount: "95000.00", maxAmount: "120000.00" });
    const report = await get("/api/analytics/band-violations");
    expect(report.body.items).toHaveLength(1);
    expect(report.body.items[0].position).toBe("BELOW");
  });

  it("creates a band for a level and country that had none", async () => {
    const saved = await put("/api/settings/pay-bands/IN/L1", {
      minAmount: "800000",
      maxAmount: "1200000",
    });

    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({
      countryCode: "IN",
      levelCode: "L1",
      currency: "INR",
      minAmount: "800000.00",
      maxAmount: "1200000.00",
    });
    expect(await prisma.payBand.count()).toBe(1);
  });

  it("refuses a maximum below the minimum", async () => {
    const response = await put("/api/settings/pay-bands/DE/L3", {
      minAmount: "100000",
      maxAmount: "90000",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PAY_BAND_INVALID");
  });

  it("returns 404 for an unknown country or level", async () => {
    const body = { minAmount: "1", maxAmount: "2" };
    expect((await put("/api/settings/pay-bands/FR/L3", body)).status).toBe(404);
    expect((await put("/api/settings/pay-bands/DE/L9", body)).status).toBe(404);
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/api/settings/pay-bands")).status).toBe(401);
    expect((await request(app).put("/api/settings/fx-rates").send({})).status).toBe(401);
  });
});
