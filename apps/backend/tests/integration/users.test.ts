import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { UserService } from "../../src/services/user-service.js";
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

const NEW_USER = {
  name: "Priya Nair",
  email: "Priya.Nair@acme.test",
  password: "a-long-password-1",
};

function addUser(body: Record<string, unknown>) {
  return request(app).post("/api/users").set("Authorization", AUTH_HEADER).send(body);
}

describe("HR users", () => {
  it("lists the HR users without their password hashes", async () => {
    const response = await request(app).get("/api/users").set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({ email: TEST_USER.email, name: TEST_USER.name }),
    ]);
    expect(response.body.items[0]).not.toHaveProperty("passwordHash");
  });

  it("adds a user who can then sign in, recording who added them", async () => {
    const created = await addUser(NEW_USER);
    const signIn = await request(app)
      .post("/api/session")
      .send({ email: NEW_USER.email, password: NEW_USER.password });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "Priya Nair",
      email: "priya.nair@acme.test",
      createdBy: TEST_USER.email,
    });
    expect(signIn.status).toBe(201);
  });

  it("refuses an email that is already used", async () => {
    await addUser(NEW_USER);

    const response = await addUser({ ...NEW_USER, email: "priya.nair@ACME.test" });

    expect(response.status).toBe(409);
  });

  it.each([
    ["a short password", { ...NEW_USER, password: "short" }],
    ["an invalid email", { ...NEW_USER, email: "priya" }],
    ["a missing name", { ...NEW_USER, name: " " }],
  ])("refuses %s", async (_name, body) => {
    expect((await addUser(body)).status).toBe(400);
  });

  it("requires a signed-in user", async () => {
    const response = await request(app).post("/api/users").send(NEW_USER);
    expect(response.status).toBe(401);
  });
});

describe("the first account", () => {
  it("is created from configuration when there are no HR users", async () => {
    await prisma.hrUser.deleteMany();

    await new UserService(prisma).ensureInitialUser("first@acme.test", "first-password-123");

    expect(await prisma.hrUser.findMany({ select: { email: true } })).toEqual([
      { email: "first@acme.test" },
    ]);
  });

  it("is not created again once any account exists", async () => {
    await new UserService(prisma).ensureInitialUser("first@acme.test", "first-password-123");

    expect(await prisma.hrUser.count()).toBe(1);
  });
});
