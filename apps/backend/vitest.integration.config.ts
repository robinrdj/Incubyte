import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    // The files share one database, so they run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
