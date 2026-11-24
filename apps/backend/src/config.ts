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
  /** The first HR account, created at startup when there are no HR users yet. */
  HR_EMAIL: z.string().trim().toLowerCase().pipe(z.email("must be an email address")),
  HR_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
  /**
   * Web app addresses allowed to call the API from a browser, comma-separated, for example
   * "https://salary.vercel.app". Empty when the web app is served from the same address, as in
   * development through the Vite proxy.
   */
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
