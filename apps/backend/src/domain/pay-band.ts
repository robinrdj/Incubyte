import { InvalidPayBandError } from "./errors.js";
import type { MinorUnits } from "./money.js";

export interface PayBand {
  readonly minMinor: MinorUnits;
  readonly maxMinor: MinorUnits;
}

export type BandPosition = "BELOW" | "WITHIN" | "ABOVE";

/** Positive minimum, maximum at or above it; a zero band would break the compa-ratio. */
export function assertValidBand(band: PayBand): void {
  if (!Number.isSafeInteger(band.minMinor) || !Number.isSafeInteger(band.maxMinor)) {
    throw new InvalidPayBandError("bounds must be whole minor units");
  }
  if (band.minMinor <= 0) {
    throw new InvalidPayBandError("minimum must be greater than zero");
  }
  if (band.maxMinor < band.minMinor) {
    throw new InvalidPayBandError("maximum is below minimum");
  }
}

/** Where an amount sits relative to a band. Bounds are inclusive. */
export function bandPosition(amount: MinorUnits, band: PayBand): BandPosition {
  assertValidBand(band);
  if (amount < band.minMinor) {
    return "BELOW";
  }
  if (amount > band.maxMinor) {
    return "ABOVE";
  }
  return "WITHIN";
}

/** Amount divided by the band midpoint; 1.0 is the midpoint. */
export function compaRatio(amount: MinorUnits, band: PayBand): number {
  assertValidBand(band);
  const midpoint = (band.minMinor + band.maxMinor) / 2;
  return amount / midpoint;
}
