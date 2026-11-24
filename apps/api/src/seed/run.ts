import { createPrismaClient } from "../db/prisma.js";
import { adminDatabaseUrl } from "../db/urls.js";
import { DEFAULT_SEED, generateDataset } from "./dataset.js";
import { loadDataset } from "./load.js";

/**
 * Seeds the database with 10,000 reproducible employees.
 *   npm run seed                 load into an empty database
 *   npm run seed -- --reset      replace all salary data with the seed
 *   npm run seed -- --seed=7     use a different (still reproducible) seed
 */
async function main(): Promise<void> {
  const url = adminDatabaseUrl(process.env);
  console.log(`seeding ${describeTarget(url)}`);

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

/** The host and database name, without the password, so the log shows where the data is going. */
function describeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "the configured database";
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
