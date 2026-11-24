import type { HrUserDto } from "@salary/shared";
import type { RequestHandler, Response } from "express";
import type { AuthService } from "../services/auth-service.js";

const USER_LOCAL = "user";

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/.exec(header ?? "");
  return match?.[1] ?? null;
}

export function requireSession(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const token = bearerToken(req.headers.authorization);
    const user = token === null ? null : await auth.authenticate(token);
    if (user === null) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue" } });
      return;
    }
    res.locals[USER_LOCAL] = user;
    next();
  };
}

export function currentUser(res: Response): HrUserDto {
  const user = res.locals[USER_LOCAL] as HrUserDto | undefined;
  if (user === undefined) {
    throw new Error("No signed-in user: the route must be mounted behind requireSession");
  }
  return user;
}

/** Recorded in the audit trail as who made a change. */
export function currentActor(res: Response): string {
  return currentUser(res).email;
}
