/**
 * The connection string for one-off admin work (migrations, seeding). Hosted PostgreSQL such as
 * Neon gives two strings: a pooled one for the running API, and a direct one for jobs that need a
 * plain session. DIRECT_DATABASE_URL is used when set; otherwise DATABASE_URL, as in local
 * development where there is only one.
 */
export function adminDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const url = env["DIRECT_DATABASE_URL"] ?? env["DATABASE_URL"];
  if (url === undefined || url.trim() === "") {
    throw new Error("Set DATABASE_URL (or DIRECT_DATABASE_URL for hosted databases).");
  }
  return url;
}
