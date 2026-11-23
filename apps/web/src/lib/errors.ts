import { ApiError } from "../api/client.js";

/**
 * Turns any failure into a sentence a person can act on. Validation failures list each field,
 * so the user sees exactly what to correct.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_FAILED" && Array.isArray(error.details)) {
      const fields = error.details
        .map((detail) => {
          const item = detail as { field?: unknown; message?: unknown };
          return typeof item.field === "string" && typeof item.message === "string"
            ? `${item.field} ${item.message}`
            : null;
        })
        .filter((text): text is string => text !== null);
      if (fields.length > 0) {
        return fields.join("; ");
      }
    }
    return error.message;
  }
  return "Something went wrong. Try again.";
}
