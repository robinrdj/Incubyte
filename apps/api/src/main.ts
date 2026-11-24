import { loadConfig } from "./config.js";
import { createPrismaClient } from "./db/prisma.js";
import { createApp } from "./http/app.js";
import { AnalyticsService } from "./services/analytics-service.js";
import { BulkExchangeService } from "./services/bulk-exchange-service.js";
import { EmployeeService } from "./services/employee-service.js";
import { SettingsService } from "./services/settings-service.js";

const config = loadConfig(process.env);
const prisma = createPrismaClient(config.DATABASE_URL);
const clock = (): Date => new Date();

const app = createApp({
  service: new EmployeeService(prisma, clock),
  analytics: new AnalyticsService(prisma, clock),
  bulk: new BulkExchangeService(prisma, clock),
  settings: new SettingsService(prisma),
  credentials: { user: config.HR_EMAIL, password: config.HR_PASSWORD },
  corsOrigins: config.CORS_ORIGIN,
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
