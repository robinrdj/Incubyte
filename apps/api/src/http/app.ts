import express, { type Express } from "express";
import { APP_NAME } from "@salary/shared";
import { requireBasicAuth, type Credentials } from "./basic-auth.js";
import { errorHandler } from "./errors.js";
import { createEmployeeRouter } from "./employee-routes.js";
import { createAnalyticsRouter } from "./analytics-routes.js";
import { createBulkRouter } from "./bulk-routes.js";
import type { EmployeeService } from "../services/employee-service.js";
import type { AnalyticsService } from "../services/analytics-service.js";
import type { BulkExchangeService } from "../services/bulk-exchange-service.js";

export interface AppDependencies {
  readonly service: EmployeeService;
  readonly analytics: AnalyticsService;
  readonly bulk: BulkExchangeService;
  readonly credentials: Credentials;
}

/**
 * Builds the HTTP application. Everything under /api requires authentication.
 * /health is public so the hosting platform can probe it.
 */
export function createApp({ service, analytics, bulk, credentials }: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: `${APP_NAME}-api` });
  });

  app.use("/api", requireBasicAuth(credentials));
  app.use("/api", createBulkRouter(bulk));
  app.use("/api", createEmployeeRouter(service));
  app.use("/api", createAnalyticsRouter(analytics));

  app.use(errorHandler);
  return app;
}
