import { describe, expect, it } from "vitest";
import { InvalidPayBandError } from "../../../src/domain/errors.js";
import {
  assertValidBand,
  bandPosition,
  compaRatio,
  type PayBand,
} from "../../../src/domain/pay-band.js";

const band: PayBand = { minMinor: 8000000, maxMinor: 12000000 }; // 80,000 to 120,000

describe("bandPosition", () => {
  it("places amounts below, within, and above the band", () => {
    expect(bandPosition(7999999, band)).toBe("BELOW");
    expect(bandPosition(9000000, band)).toBe("WITHIN");
    expect(bandPosition(12000001, band)).toBe("ABOVE");
  });

  it("treats both bounds as inclusive", () => {
    expect(bandPosition(8000000, band)).toBe("WITHIN");
    expect(bandPosition(12000000, band)).toBe("WITHIN");
  });

  it("accepts a point band where minimum equals maximum", () => {
    const point: PayBand = { minMinor: 5000000, maxMinor: 5000000 };
    expect(bandPosition(5000000, point)).toBe("WITHIN");
  });
});

describe("compaRatio", () => {
  it("is 1.0 at the midpoint", () => {
    // midpoint of 80,000 and 120,000 is 100,000
    expect(compaRatio(10000000, band)).toBe(1);
  });

  it("is below 1.0 under the midpoint and above 1.0 over it", () => {
    expect(compaRatio(9000000, band)).toBeLessThan(1);
    expect(compaRatio(11000000, band)).toBeGreaterThan(1);
  });
});

describe("band validation (edge cases)", () => {
  it("rejects a zero-valued band, which would make the midpoint zero", () => {
    const zero: PayBand = { minMinor: 0, maxMinor: 0 };
    expect(() => {
      assertValidBand(zero);
    }).toThrow(InvalidPayBandError);
    expect(() => compaRatio(100, zero)).toThrow(/greater than zero/);
  });

  it("rejects a band whose minimum is zero even if the maximum is positive", () => {
    expect(() => {
      bandPosition(100, { minMinor: 0, maxMinor: 500 });
    }).toThrow(InvalidPayBandError);
  });

  it("rejects a band whose maximum is below its minimum", () => {
    expect(() => {
      assertValidBand({ minMinor: 500, maxMinor: 100 });
    }).toThrow(/below minimum/);
  });

  it("rejects non-integer bounds", () => {
    expect(() => {
      assertValidBand({ minMinor: 100.5, maxMinor: 200 });
    }).toThrow(/whole minor units/);
  });
});
