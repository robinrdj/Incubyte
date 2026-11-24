import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, "is required"),
  /** The HR Manager's sign-in email. Compared in lower case, as the web app sends it. */
  HR_EMAIL: z.string().trim().toLowerCase().pipe(z.email("must be an email address")),
  HR_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Reads and validates configuration from environment variables. Fails fast with a clear message. */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${problems}`);
  }
  return result.data;
}
