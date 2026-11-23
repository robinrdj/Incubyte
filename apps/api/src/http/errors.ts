import { Prisma } from "../generated/prisma/client.js";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "../domain/errors.js";

/** An error with an HTTP status, raised by services and mapped to a JSON response. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string): HttpError =>
  new HttpError(404, "NOT_FOUND", `${what} not found`);

export const conflict = (message: string): HttpError => new HttpError(409, "CONFLICT", message);

export const unprocessable = (message: string): HttpError =>
  new HttpError(422, "UNPROCESSABLE", message);

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Maps every failure to a consistent JSON body: { error: { code, message, details? } }.
 * Internal details are never sent to the client.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const send = (status: number, body: ErrorBody): void => {
    res.status(status).json(body);
  };

  if (err instanceof HttpError) {
    send(err.status, {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details === undefined ? {} : { details: err.details }),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    send(400, {
      error: {
        code: "VALIDATION_FAILED",
        message: "The request is invalid",
        details: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof DomainError) {
    send(422, { error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    send(409, { error: { code: "CONFLICT", message: "A record with this value already exists" } });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    send(400, { error: { code: "MALFORMED_JSON", message: "Request body is not valid JSON" } });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: unknown }).type === "entity.too.large"
  ) {
    send(413, { error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large" } });
    return;
  }

  console.error("Unhandled error", err);
  send(500, { error: { code: "INTERNAL", message: "An unexpected error occurred" } });
};
