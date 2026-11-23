import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Integration tests: run against the real test database (TEST_DATABASE_URL).
config({ path: resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
    // Shared database state: run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
