import { Router } from "express";
import type { UserService } from "../services/user-service.js";
import { currentActor } from "./require-session.js";
import { createHrUserSchema } from "./schemas.js";

export function createUserRouter(users: UserService): Router {
  const router = Router();

  router.get("/users", async (_req, res) => {
    res.json({ items: await users.list() });
  });

  router.post("/users", async (req, res) => {
    const input = createHrUserSchema.parse(req.body);
    res.status(201).json(await users.create(input, currentActor(res)));
  });

  return router;
}
