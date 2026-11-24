export interface DemoAccount {
  email: string;
  password: string;
}

const DEFAULT_DEMO_ACCOUNT: DemoAccount = {
  email: "hr.manager@acme.test",
  password: "AcmeHR-demo-2026",
};

/** Shown on the sign-in page; VITE_HIDE_DEMO_ACCOUNT=true hides it for real data. */
export function demoAccount(env: Record<string, unknown> = import.meta.env): DemoAccount | null {
  if (env["VITE_HIDE_DEMO_ACCOUNT"] === "true") return null;
  const email = env["VITE_DEMO_EMAIL"];
  const password = env["VITE_DEMO_PASSWORD"];
  return {
    email:
      typeof email === "string" && email.trim() !== "" ? email.trim() : DEFAULT_DEMO_ACCOUNT.email,
    password:
      typeof password === "string" && password !== "" ? password : DEFAULT_DEMO_ACCOUNT.password,
  };
}
