export interface DemoAccount {
  email: string;
  password: string;
}

/**
 * The demo sign-in shown on the login page, from VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD at build
 * time. It is for the hosted demo, whose data is generated. Leave either empty to hide the hint,
 * which is what a deployment holding real salaries should do.
 */
export function demoAccount(env: Record<string, unknown> = import.meta.env): DemoAccount | null {
  const email = env["VITE_DEMO_EMAIL"];
  const password = env["VITE_DEMO_PASSWORD"];
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (email.trim() === "" || password === "") return null;
  return { email: email.trim(), password };
}
