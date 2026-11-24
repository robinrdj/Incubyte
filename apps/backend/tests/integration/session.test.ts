import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  AUTH_HEADER,
  TEST_USER,
  createTestApp,
  createTestClient,
  resetDatabase,
} from "./helpers.js";

let prisma: PrismaClient;
let app: ReturnType<typeof createTestApp>;

beforeAll(() => {
  prisma = createTestClient();
  app = createTestApp(prisma);
});
beforeEach(() => resetDatabase(prisma));
afterAll(() => prisma.$disconnect());

function signIn(email: string, password: string) {
  return request(app).post("/api/session").send({ email, password });
}

describe("signing in", () => {
  it("returns a session token and the signed-in user", async () => {
    const response = await signIn(TEST_USER.email, TEST_USER.password);

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ email: TEST_USER.email, name: TEST_USER.name });
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("accepts the email in any letter case", async () => {
    const response = await signIn(TEST_USER.email.toUpperCase(), TEST_USER.password);
    expect(response.status).toBe(201);
  });

  it("lets the token be used for later requests", async () => {
    const { token } = (await signIn(TEST_USER.email, TEST_USER.password)).body as {
      token: string;
    };

    const response = await request(app)
      .get("/api/reference")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it.each([
    ["a wrong password", TEST_USER.email, "not-the-password"],
    ["an unknown email", "nobody@acme.test", TEST_USER.password],
  ])("refuses %s with the same message", async (_name, email, password) => {
    const response = await signIn(email, password);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Incorrect email or password");
  });

  it("stores only a hash of the token", async () => {
    const { token } = (await signIn(TEST_USER.email, TEST_USER.password)).body as {
      token: string;
    };

    const stored = await prisma.session.findMany({ select: { tokenHash: true } });
    expect(stored.map((s) => s.tokenHash)).not.toContain(token);
  });
});

describe("using a session", () => {
  it("rejects requests without a token", async () => {
    const response = await request(app).get("/api/employees");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toBeUndefined();
  });

  it("rejects an unknown token", async () => {
    const response = await request(app)
      .get("/api/employees")
      .set("Authorization", "Bearer not-a-real-token");
    expect(response.status).toBe(401);
  });

  it("rejects an expired session", async () => {
    await prisma.session.updateMany({ data: { expiresAt: new Date("2020-01-01T00:00:00Z") } });

    const response = await request(app).get("/api/employees").set("Authorization", AUTH_HEADER);
    expect(response.status).toBe(401);
  });

  it("reports who is signed in", async () => {
    const response = await request(app).get("/api/session").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(TEST_USER.email);
  });

  it("ends the session on sign-out", async () => {
    const signOut = await request(app).delete("/api/session").set("Authorization", AUTH_HEADER);
    const after = await request(app).get("/api/employees").set("Authorization", AUTH_HEADER);

    expect(signOut.status).toBe(204);
    expect(after.status).toBe(401);
  });
});
