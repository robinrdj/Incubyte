/** Base class for business-rule violations raised by domain functions. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class MissingFxRateError extends DomainError {
  constructor(currency: string) {
    super(`No FX rate is available for ${currency}.`, "FX_RATE_MISSING");
  }
}

export class InvalidFxRateError extends DomainError {
  constructor(currency: string, rate: number) {
    super(
      `FX rate for ${currency} must be a positive number, got ${String(rate)}.`,
      "FX_RATE_INVALID",
    );
  }
}

export class InvalidPayBandError extends DomainError {
  constructor(reason: string) {
    super(`Invalid pay band: ${reason}.`, "PAY_BAND_INVALID");
  }
}
