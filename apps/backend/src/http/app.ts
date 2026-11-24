import cors from "cors";
import express, { type Express } from "express";
import { APP_NAME } from "@salary/shared";
import type { AnalyticsService } from "../services/analytics-service.js";
import type { AuthService } from "../services/auth-service.js";
import type { BulkExchangeService } from "../services/bulk-exchange-service.js";
import type { EmployeeService } from "../services/employee-service.js";
import type { SettingsService } from "../services/settings-service.js";
import type { UserService } from "../services/user-service.js";
import { createAnalyticsRouter } from "./analytics-routes.js";
import { createBulkRouter } from "./bulk-routes.js";
import { createEmployeeRouter } from "./employee-routes.js";
import { errorHandler } from "./errors.js";
import { requireSession } from "./require-session.js";
import { createSessionRouter } from "./session-routes.js";
import { createSettingsRouter } from "./settings-routes.js";
import { createUserRouter } from "./user-routes.js";

export interface AppDependencies {
  readonly employees: EmployeeService;
  readonly analytics: AnalyticsService;
  readonly bulk: BulkExchangeService;
  readonly settings: SettingsService;
  readonly auth: AuthService;
  readonly users: UserService;
  /** Browser origins allowed to call the API. Empty allows same-origin use only. */
  readonly corsOrigins?: readonly string[];
}

/** `/health` and signing in are public; every other `/api` route needs a session. */
export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");

  const corsOrigins = deps.corsOrigins ?? [];
  if (corsOrigins.length > 0) {
    app.use(
      cors({
        origin: [...corsOrigins],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Authorization", "Content-Type", "Accept"],
        maxAge: 600,
      }),
    );
  }

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: `${APP_NAME}-api` });
  });

  app.use("/api", createSessionRouter(deps.auth));
  app.use("/api", requireSession(deps.auth));
  app.use("/api", createBulkRouter(deps.bulk));
  app.use("/api", createEmployeeRouter(deps.employees));
  app.use("/api", createAnalyticsRouter(deps.analytics));
  app.use("/api", createSettingsRouter(deps.settings));
  app.use("/api", createUserRouter(deps.users));

  app.use(errorHandler);
  return app;
}
