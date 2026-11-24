import { createHash, randomBytes } from "node:crypto";

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Sessions are looked up by this hash, so a copy of the database holds no usable tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
