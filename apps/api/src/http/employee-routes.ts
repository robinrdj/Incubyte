import { Router } from "express";
import { ACTOR_LOCAL } from "./basic-auth.js";
import {
  employeeIdSchema,
  createEmployeeSchema,
  listEmployeesQuerySchema,
  salaryChangeSchema,
  updateEmployeeSchema,
} from "./schemas.js";
import type { EmployeeService } from "../services/employee-service.js";

function actorOf(locals: Record<string, unknown>): string {
  const actor = locals[ACTOR_LOCAL];
  if (typeof actor !== "string") {
    throw new Error("Actor missing: routes must run behind requireBasicAuth");
  }
  return actor;
}

/** Employee and salary endpoints. All routes assume the router is mounted behind authentication. */
export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get("/reference", async (_req, res) => {
    res.json(await service.reference());
  });

  router.get("/employees", async (req, res) => {
    const query = listEmployeesQuerySchema.parse(req.query);
    res.json(await service.list(query));
  });

  router.post("/employees", async (req, res) => {
    const input = createEmployeeSchema.parse(req.body);
    const created = await service.create(input, actorOf(res.locals));
    res.status(201).json(created);
  });

  router.get("/employees/:id", async (req, res) => {
    const id = employeeIdSchema.parse(req.params["id"]);
    res.json(await service.get(id));
  });

  router.patch("/employees/:id", async (req, res) => {
    const id = employeeIdSchema.parse(req.params["id"]);
    const patch = updateEmployeeSchema.parse(req.body);
    res.json(await service.update(id, patch, actorOf(res.locals)));
  });

  router.post("/employees/:id/salary-changes", async (req, res) => {
    const id = employeeIdSchema.parse(req.params["id"]);
    const input = salaryChangeSchema.parse(req.body);
    const record = await service.addSalaryChange(id, input, actorOf(res.locals));
    res.status(201).json(record);
  });

  router.get("/employees/:id/salary-history", async (req, res) => {
    const id = employeeIdSchema.parse(req.params["id"]);
    res.json({ items: await service.salaryHistory(id) });
  });

  router.get("/employees/:id/audit", async (req, res) => {
    const id = employeeIdSchema.parse(req.params["id"]);
    res.json({ items: await service.auditTrail(id) });
  });

  return router;
}
