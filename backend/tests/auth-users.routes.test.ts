import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { registerAuthRoutes } from "../src/modules/auth/auth.router.js";
import { registerUserRoutes } from "../src/modules/users/user.router.js";
import type { UserRepository } from "../src/modules/users/repository/user.repository.js";
import type {
  UserEntity,
  CreateUserData,
  UpdateUserData,
} from "../src/modules/users/entity/user.entity.js";
import { errorHandler } from "../src/shared/errors/error-handler.js";

function makeRepository(): UserRepository {
  const users: UserEntity[] = [];
  return {
    async create(data: CreateUserData) {
      const now = new Date();
      const user: UserEntity = {
        id: BigInt(users.length + 1),
        role: "EMPLOYEE",
        active: true,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      users.push(user);
      return user;
    },
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async findByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async findAll() {
      return users;
    },
    async update(id, data: UpdateUserData) {
      const user = users.find((item) => item.id === id);
      if (!user) throw new Error("missing user");
      Object.assign(user, data);
      return user;
    },
  };
}

test("registration and login issue employee JWT without exposing password hash", async () => {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "test-secret" });
  const repository = makeRepository();
  await app.register(registerAuthRoutes, { repository });
  const registered = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: "Ana",
      email: " ANA@example.com ",
      password: "secret123",
      role: "ADMIN",
    },
  });
  assert.equal(registered.statusCode, 400);
  const created = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Ana", email: " ANA@example.com ", password: "secret123" },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().user.role, "EMPLOYEE");
  assert.equal(created.json().user.passwordHash, undefined);
  assert.equal(
    app.jwt.verify<{ role: string }>(created.json().accessToken).role,
    "EMPLOYEE",
  );
  const registeredToken = app.jwt.verify<{ iat: number; exp: number }>(
    created.json().accessToken,
  );
  assert.equal(registeredToken.exp - registeredToken.iat, 8 * 60 * 60);
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "ana@example.com", password: "secret123" },
  });
  assert.equal(login.statusCode, 200);
  const loginToken = app.jwt.verify<{ iat: number; exp: number }>(
    login.json().accessToken,
  );
  assert.equal(loginToken.exp - loginToken.iat, 8 * 60 * 60);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "ana@example.com", password: "wrongpass" },
      })
    ).statusCode,
    401,
  );
  await repository.update(1n, { active: false });
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "ana@example.com", password: "secret123" },
      })
    ).statusCode,
    401,
  );
  await app.close();
});

test("users can only be created through auth registration; user management requires admin", async () => {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "test-secret" });
  const repository = makeRepository();
  await repository.create({
    name: "Admin",
    email: "admin@example.com",
    passwordHash: "unused",
    role: "ADMIN",
  });
  await app.register(registerAuthRoutes, { repository });
  await app.register(registerUserRoutes, { repository });
  assert.equal(
    (await app.inject({ method: "GET", url: "/users" })).statusCode,
    401,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/users",
        headers: { authorization: "Bearer invalid" },
      })
    ).statusCode,
    401,
  );
  const employee = app.jwt.sign({
    id: "1",
    email: "employee@example.com",
    role: "EMPLOYEE",
  });
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/users",
        headers: { authorization: `Bearer ${employee}` },
      })
    ).statusCode,
    403,
  );
  const admin = app.jwt.sign({
    id: "1",
    email: "admin@example.com",
    role: "ADMIN",
  });
  const headers = { authorization: `Bearer ${admin}` };
  const blocked = await app.inject({
    method: "POST",
    url: "/users",
    headers,
    payload: { name: "Bob", email: "bob@example.com", password: "secret123" },
  });
  assert.equal(blocked.statusCode, 404);
  assert.equal(await repository.findByEmail("bob@example.com"), null);
  const created = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Bob", email: "bob@example.com", password: "secret123" },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().user.passwordHash, undefined);
  assert.equal(
    (await app.inject({ method: "GET", url: "/users", headers })).json().length,
    2,
  );
  assert.equal(
    (await app.inject({ method: "GET", url: "/users/2", headers })).json().name,
    "Bob",
  );
  assert.equal(
    (
      await app.inject({
        method: "PATCH",
        url: "/users/2",
        headers,
        payload: { name: "Bobby" },
      })
    ).json().name,
    "Bobby",
  );
  assert.equal(
    (await app.inject({ method: "DELETE", url: "/users/2", headers }))
      .statusCode,
    204,
  );
  assert.equal((await repository.findById(2n))?.active, false);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "bob@example.com", password: "secret123" },
      })
    ).statusCode,
    401,
  );
  await repository.update(1n, { role: "EMPLOYEE" });
  assert.equal(
    (await app.inject({ method: "GET", url: "/users", headers })).statusCode,
    403,
  );
  await repository.update(1n, { role: "ADMIN", active: false });
  assert.equal(
    (await app.inject({ method: "GET", url: "/users", headers })).statusCode,
    403,
  );
  await app.close();
});

test("login and registration reject excessive requests from one client", async () => {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.register(registerAuthRoutes, { repository: makeRepository() });

  for (const url of ["/auth/login", "/auth/register"]) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await app.inject({ method: "POST", url, payload: {} });
      assert.equal(response.statusCode, 400);
    }
    const limited = await app.inject({ method: "POST", url, payload: {} });
    assert.equal(limited.statusCode, 429);
  }
  await app.close();
});
