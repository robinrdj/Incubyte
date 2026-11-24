import { Router, type Response } from "express";
import { bandViolationsToCsv, compensationToCsv } from "../domain/analytics-csv.js";
import type { AnalyticsService } from "../services/analytics-service.js";
import { bandViolationsQuerySchema, compensationQuerySchema } from "./schemas.js";

function sendCsv(res: Response, filename: string, csv: string): void {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

/** All figures in USD, active employees only. */
export function createAnalyticsRouter(service: AnalyticsService): Router {
  const router = Router();

  router.get("/analytics/compensation", async (req, res) => {
    const query = compensationQuerySchema.parse(req.query);
    res.json(await service.compensation(query.groupBy, query.asOf));
  });

  router.get("/analytics/compensation.csv", async (req, res) => {
    const query = compensationQuerySchema.parse(req.query);
    const report = await service.compensation(query.groupBy, query.asOf);
    sendCsv(res, `compensation-by-${report.groupBy}-${report.asOf}.csv`, compensationToCsv(report));
  });

  router.get("/analytics/band-violations", async (req, res) => {
    const query = bandViolationsQuerySchema.parse(req.query);
    res.json(await service.bandViolations(query));
  });

  /** The full list, not one page. */
  router.get("/analytics/band-violations.csv", async (req, res) => {
    const { asOf, position } = bandViolationsQuerySchema.parse(req.query);
    const report = await service.bandViolations({
      ...(asOf === undefined ? {} : { asOf }),
      ...(position === undefined ? {} : { position }),
    });
    const scope = position === undefined ? "outside" : position.toLowerCase();
    sendCsv(res, `pay-band-${scope}-${report.asOf}.csv`, bandViolationsToCsv(report));
  });

  return router;
}
