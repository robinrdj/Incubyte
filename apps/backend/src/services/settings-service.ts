import type { FxRateDto, FxRateListDto, PayBandDto } from "@salary/shared";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { REPORTING_CURRENCY } from "../domain/fx.js";
import { parseMoney } from "../domain/money.js";
import { assertValidBand } from "../domain/pay-band.js";
import { notFound, unprocessable } from "../http/errors.js";
import type { SaveFxRateInput, SavePayBandInput } from "../http/schemas.js";

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const fromDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

function toMinor(amount: string): number {
  const parsed = parseMoney(amount);
  if (!parsed.ok) {
    throw unprocessable(parsed.error);
  }
  return parsed.value;
}

/**
 * Maintenance of the two tables HR edits by hand: dated FX rates and pay bands.
 * The seed loads sensible defaults for both, and this service lets HR change them.
 */
export class SettingsService {
  constructor(private readonly db: PrismaClient) {}

  async listFxRates(): Promise<FxRateListDto> {
    const rows = await this.db.fxRate.findMany({
      where: { toCurrency: REPORTING_CURRENCY },
      orderBy: [{ fromCurrency: "asc" }, { rateDate: "desc" }],
    });
    return {
      reportingCurrency: REPORTING_CURRENCY,
      items: rows.map((row) => ({
        currency: row.fromCurrency,
        rate: row.rate.toFixed(8),
        rateDate: toDateOnly(row.rateDate),
      })),
    };
  }

  /**
   * Stores the rate for a currency on a date. A new date adds a rate; the analytics use the latest
   * rate on or before the date they report on, so earlier figures keep their earlier rate. Saving a
   * date that already has a rate replaces it, which is how a typing mistake is corrected.
   */
  async saveFxRate(input: SaveFxRateInput): Promise<FxRateDto> {
    if (input.currency === REPORTING_CURRENCY) {
      throw unprocessable(`${REPORTING_CURRENCY} is the reporting currency and always has rate 1.`);
    }
    const usedBy = await this.db.country.count({ where: { currency: input.currency } });
    if (usedBy === 0) {
      throw unprocessable(`No country pays salaries in ${input.currency}.`);
    }

    const rate = new Prisma.Decimal(input.rate);
    const rateDate = fromDateOnly(input.rateDate);
    const row = await this.db.fxRate.upsert({
      where: {
        fromCurrency_toCurrency_rateDate: {
          fromCurrency: input.currency,
          toCurrency: REPORTING_CURRENCY,
          rateDate,
        },
      },
      create: { fromCurrency: input.currency, toCurrency: REPORTING_CURRENCY, rate, rateDate },
      update: { rate },
    });
    return {
      currency: row.fromCurrency,
      rate: row.rate.toFixed(8),
      rateDate: toDateOnly(row.rateDate),
    };
  }

  async listPayBands(): Promise<PayBandDto[]> {
    const rows = await this.db.payBand.findMany({
      include: { country: true, level: true },
      orderBy: [{ country: { name: "asc" } }, { level: { rank: "asc" } }],
    });
    return rows.map((row) => ({
      countryCode: row.country.code,
      levelCode: row.level.code,
      currency: row.currency,
      minAmount: row.minAmount.toFixed(2),
      maxAmount: row.maxAmount.toFixed(2),
    }));
  }

  /**
   * Sets the band for a level in a country, creating it if the pair has none yet. Bands are in the
   * country's currency, so they need no FX rate until they are compared in USD.
   */
  async savePayBand(
    countryCode: string,
    levelCode: string,
    input: SavePayBandInput,
  ): Promise<PayBandDto> {
    const [country, level] = await Promise.all([
      this.db.country.findUnique({ where: { code: countryCode } }),
      this.db.level.findUnique({ where: { code: levelCode } }),
    ]);
    if (country === null) throw notFound(`Country ${countryCode}`);
    if (level === null) throw notFound(`Level ${levelCode}`);

    const minMinor = toMinor(input.minAmount);
    const maxMinor = toMinor(input.maxAmount);
    assertValidBand({ minMinor, maxMinor });

    const amounts = {
      currency: country.currency,
      minAmount: new Prisma.Decimal(minMinor).div(100),
      maxAmount: new Prisma.Decimal(maxMinor).div(100),
    };
    const row = await this.db.payBand.upsert({
      where: { levelId_countryId: { levelId: level.id, countryId: country.id } },
      create: { levelId: level.id, countryId: country.id, ...amounts },
      update: amounts,
    });
    return {
      countryCode: country.code,
      levelCode: level.code,
      currency: row.currency,
      minAmount: row.minAmount.toFixed(2),
      maxAmount: row.maxAmount.toFixed(2),
    };
  }
}
