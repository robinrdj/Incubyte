import express, { Router } from "express";
import { z } from "zod";
import type { BulkExchangeService } from "../services/bulk-exchange-service.js";
import { ACTOR_LOCAL } from "./basic-auth.js";
import { HttpError } from "./errors.js";
import { employeeFilterSchema } from "./schemas.js";

const importQuerySchema = z
  .object({ dryRun: z.enum(["true", "false"]).default("false") })
  .transform((query) => query.dryRun === "true");

function actorOf(locals: Record<string, unknown>): string {
  const actor = locals[ACTOR_LOCAL];
  if (typeof actor !== "string") {
    throw new Error("Actor missing: routes must run behind requireBasicAuth");
  }
  return actor;
}

/**
 * CSV import and export. The import takes the raw file as the request body (text/csv, up to 5 MB),
 * so no multipart parser is needed. Pass ?dryRun=true to validate without writing.
 */
export function createBulkRouter(service: BulkExchangeService): Router {
  const router = Router();

  router.post(
    "/employees/import",
    express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
    async (req, res) => {
      const dryRun = importQuerySchema.parse(req.query);
      if (typeof req.body !== "string") {
        throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the file as text/csv");
      }
      const report = await service.importEmployees(req.body, { dryRun }, actorOf(res.locals));
      res.json(report);
    },
  );

  // Registered before the /employees/:id routes so "export.csv" is not read as an id.
  router.get("/employees/export.csv", async (req, res) => {
    const filters = employeeFilterSchema.parse(req.query);
    const csv = await service.exportEmployeesCsv(filters);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
    res.send(csv);
  });

  return router;
}
