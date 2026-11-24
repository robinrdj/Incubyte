import { z } from "zod";

/** True for a bare http(s) origin: a scheme and host, with no path, query, or fragment. */
function isOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === value;
  } catch {
    return false;
  }
}

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, "is required"),
  /** Used to create the first HR account when there are none. */
  HR_EMAIL: z.string().trim().toLowerCase().pipe(z.email("must be an email address")),
  HR_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Browser origins allowed to call the API, comma-separated. Empty in development. */
  CORS_ORIGIN: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter((origin) => origin !== ""),
    )
    .pipe(
      z.array(
        z
          .string()
          .refine(isOrigin, "must be web addresses such as https://app.example.com, with no path"),
      ),
    ),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Fails fast with a clear message when a variable is missing or invalid. */
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
