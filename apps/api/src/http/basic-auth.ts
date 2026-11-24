import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export interface Credentials {
  readonly user: string;
  readonly password: string;
}

/** Compares two strings in constant time. Hashing first makes the lengths equal. */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB) && a === b;
}

/** Name of the authenticated user, stored on res.locals for audit trails. */
export const ACTOR_LOCAL = "actor";

/**
 * HTTP Basic authentication for the single HR account (v1).
 * Sets res.locals.actor to the authenticated user so writes can record who made them.
 */
export function requireBasicAuth(expected: Credentials): RequestHandler {
  return (req, res, next) => {
    const deny = (): void => {
      // The web app marks its requests, and a Basic challenge would make the browser show its own
      // sign-in dialog over the app. Other clients, such as curl, still get the standard challenge.
      if (req.get("X-Requested-With") !== "XMLHttpRequest") {
        res.set("WWW-Authenticate", 'Basic realm="salary-management"');
      }
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    };

    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Basic ")) {
      deny();
      return;
    }

    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) {
      deny();
      return;
    }

    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (!safeEqual(user, expected.user) || !safeEqual(password, expected.password)) {
      deny();
      return;
    }

    res.locals[ACTOR_LOCAL] = user;
    next();
  };
}
