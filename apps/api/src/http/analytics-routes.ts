import { Router } from "express";
import type { AnalyticsService } from "../services/analytics-service.js";
import { bandViolationsQuerySchema, compensationQuerySchema } from "./schemas.js";

/** Read-only compensation analytics. Every figure is in USD and uses the active headcount. */
export function createAnalyticsRouter(service: AnalyticsService): Router {
  const router = Router();

  router.get("/analytics/compensation", async (req, res) => {
    const query = compensationQuerySchema.parse(req.query);
    res.json(await service.compensation(query.groupBy, query.asOf));
  });

  router.get("/analytics/band-violations", async (req, res) => {
    const query = bandViolationsQuerySchema.parse(req.query);
    res.json(await service.bandViolations(query.asOf));
  });

  return router;
}
