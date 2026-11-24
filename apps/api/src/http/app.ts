import cors from "cors";
import express, { type Express } from "express";
import { APP_NAME } from "@salary/shared";
import { requireBasicAuth, type Credentials } from "./basic-auth.js";
import { errorHandler } from "./errors.js";
import { createEmployeeRouter } from "./employee-routes.js";
import { createAnalyticsRouter } from "./analytics-routes.js";
import { createBulkRouter } from "./bulk-routes.js";
import { createSettingsRouter } from "./settings-routes.js";
import type { EmployeeService } from "../services/employee-service.js";
import type { AnalyticsService } from "../services/analytics-service.js";
import type { BulkExchangeService } from "../services/bulk-exchange-service.js";
import type { SettingsService } from "../services/settings-service.js";

export interface AppDependencies {
  readonly service: EmployeeService;
  readonly analytics: AnalyticsService;
  readonly bulk: BulkExchangeService;
  readonly settings: SettingsService;
  readonly credentials: Credentials;
  /** Browser origins allowed to call the API. Empty allows same-origin use only. */
  readonly corsOrigins?: readonly string[];
}

/**
 * Builds the HTTP application. Everything under /api requires authentication.
 * /health is public so the hosting platform can probe it.
 */
export function createApp({
  service,
  analytics,
  bulk,
  settings,
  credentials,
  corsOrigins = [],
}: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");

  // Before authentication, so the browser's preflight request (which carries no credentials) is
  // answered. The token travels in the Authorization header, not a cookie, so credentials mode is
  // not needed.
  if (corsOrigins.length > 0) {
    app.use(
      cors({
        origin: [...corsOrigins],
        methods: ["GET", "POST", "PUT", "PATCH"],
        allowedHeaders: ["Authorization", "Content-Type", "Accept", "X-Requested-With"],
        maxAge: 600,
      }),
    );
  }

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: `${APP_NAME}-api` });
  });

  app.use("/api", requireBasicAuth(credentials));
  app.use("/api", createBulkRouter(bulk));
  app.use("/api", createEmployeeRouter(service));
  app.use("/api", createAnalyticsRouter(analytics));
  app.use("/api", createSettingsRouter(settings));

  app.use(errorHandler);
  return app;
}
