import { Router } from "express";
import type { AuthService } from "../services/auth-service.js";
import { HttpError } from "./errors.js";
import { bearerToken, currentUser, requireSession } from "./require-session.js";
import { signInSchema } from "./schemas.js";

export function createSessionRouter(auth: AuthService): Router {
  const router = Router();

  router.post("/session", async (req, res) => {
    const { email, password } = signInSchema.parse(req.body);
    const session = await auth.signIn(email, password);
    if (session === null) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
    }
    res.status(201).json(session);
  });

  router.get("/session", requireSession(auth), (_req, res) => {
    res.json({ user: currentUser(res) });
  });

  router.delete("/session", requireSession(auth), async (req, res) => {
    const token = bearerToken(req.headers.authorization);
    if (token !== null) await auth.signOut(token);
    res.status(204).end();
  });

  return router;
}
