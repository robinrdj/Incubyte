import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load the repository-root .env so the Prisma CLI sees the connection strings.
config({ path: resolve(import.meta.dirname, "../../.env") });

// Set PRISMA_USE_TEST_DB=1 to run migration commands against the test database.
// Hosted databases (Neon) give a direct string for migrations as DIRECT_DATABASE_URL; the running
// API uses the pooled DATABASE_URL. Locally there is only DATABASE_URL.
const urlVariable =
  process.env["PRISMA_USE_TEST_DB"] === "1"
    ? "TEST_DATABASE_URL"
    : process.env["DIRECT_DATABASE_URL"]
      ? "DIRECT_DATABASE_URL"
      : "DATABASE_URL";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env(urlVariable),
  },
});
