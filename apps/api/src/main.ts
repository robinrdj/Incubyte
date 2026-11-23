import { loadConfig } from "./config.js";
import { createPrismaClient } from "./db/prisma.js";
import { createApp } from "./http/app.js";
import { EmployeeService } from "./services/employee-service.js";

const config = loadConfig(process.env);
const prisma = createPrismaClient(config.DATABASE_URL);
const service = new EmployeeService(prisma, () => new Date());

const app = createApp({
  service,
  credentials: { user: config.BASIC_AUTH_USER, password: config.BASIC_AUTH_PASSWORD },
});

const server = app.listen(config.PORT, () => {
  console.log(`salary-management API listening on port ${String(config.PORT)}`);
});

const shutdown = (): void => {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
