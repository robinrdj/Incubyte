import { createPrismaClient } from "../db/prisma.js";
import { DEFAULT_SEED, generateDataset } from "./dataset.js";
import { loadDataset } from "./load.js";

/**
 * Seeds the database with 10,000 reproducible employees.
 *   npm run seed                 load into an empty database
 *   npm run seed -- --reset      replace all salary data with the seed
 *   npm run seed -- --seed=7     use a different (still reproducible) seed
 */
async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const reset = process.argv.includes("--reset");
  const seedArg = process.argv.find((arg) => arg.startsWith("--seed="));
  const seed = seedArg ? Number(seedArg.slice("--seed=".length)) : DEFAULT_SEED;
  if (!Number.isInteger(seed)) {
    throw new Error(`--seed must be an integer, got ${seedArg ?? ""}`);
  }

  const generateStart = performance.now();
  const dataset = generateDataset({ seed });
  const generateMs = Math.round(performance.now() - generateStart);

  const db = createPrismaClient(url);
  try {
    const report = await loadDataset(db, dataset, { reset });
    console.log(`seed ${String(seed)}: generated in ${String(generateMs)} ms`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
