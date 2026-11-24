/** DIRECT_DATABASE_URL (Neon's unpooled string) for migrations and seeding, else DATABASE_URL. */
export function adminDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const url = env["DIRECT_DATABASE_URL"] ?? env["DATABASE_URL"];
  if (url === undefined || url.trim() === "") {
    throw new Error("Set DATABASE_URL (or DIRECT_DATABASE_URL for hosted databases).");
  }
  return url;
}
