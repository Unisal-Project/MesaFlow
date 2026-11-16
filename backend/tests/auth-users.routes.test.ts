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

/** App com Ana (token) e Bia; o rate limit é por app, então cada teste cria o seu. */
async function passwordApp() {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "test-secret" });
  const repository = makeRepository();
  await app.register(registerAuthRoutes, { repository });
  const signup = async (email: string) =>
    (
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { name: "Ana", email, password: "secret123" },
      })
    ).json().accessToken as string;
  const bearer = `Bearer ${await signup("ana@example.com")}`;
  await signup("bia@example.com");
  const change = (payload: object, authorization: string | null = bearer) =>
    app.inject({
      method: "PATCH",
      url: "/auth/password",
      headers: authorization ? { authorization } : {},
      payload,
    });
  const login = async (email: string, password: string) =>
    (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password },
      })
    ).statusCode;
  return { app, repository, change, login };
}

test("PATCH /auth/password exige token e valida o corpo", async () => {
  const { app, change } = await passwordApp();
  const valid = { currentPassword: "secret123", newPassword: "novaSenha1" };
  assert.equal((await change(valid, null)).statusCode, 401);
  assert.equal(
    (await change({ ...valid, newPassword: "curta" })).statusCode,
    400,
  );
  assert.equal(
    (await change({ ...valid, newPassword: "secret123" })).statusCode,
    400,
  );
  // O id vem só do token: campo extra no corpo é recusado (strict).
  assert.equal((await change({ ...valid, id: "2" })).statusCode, 400);
  await app.close();
});

test("PATCH /auth/password troca só a senha do usuário do token", async () => {
  const { app, repository, change, login } = await passwordApp();
  const wrong = await change({
    currentPassword: "errada123",
    newPassword: "novaSenha1",
  });
  assert.equal(wrong.statusCode, 400);
  assert.equal(wrong.json().message, "Senha atual incorreta");
  assert.equal(
    (await change({ currentPassword: "secret123", newPassword: "novaSenha1" }))
      .statusCode,
    204,
  );
  assert.equal(await login("ana@example.com", "novaSenha1"), 200);
  assert.equal(await login("ana@example.com", "secret123"), 401);
  assert.equal(await login("bia@example.com", "secret123"), 200);

  await repository.update(1n, { active: false });
  assert.equal(
    (await change({ currentPassword: "novaSenha1", newPassword: "outra1234" }))
      .statusCode,
    403,
  );
  await app.close();
});

test("perfil próprio valida senha e identidade", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const { app, repository } = await passwordApp();
  const token = (
    await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@example.com", password: "secret123" },
    })
  ).json().accessToken;
  const patch = (payload: object, auth = true) => (
    t.mock.timers.tick(60_001),
    app.inject({
      method: "PATCH",
      url: "/auth/me",
      payload,
      headers: auth ? { authorization: `Bearer ${token}` } : {},
    })
  );
  try {
    assert.equal((await patch({ name: "Nova" }, false)).statusCode, 401);
    const renamed = await patch({ name: "Nova" });
    assert.equal(renamed.statusCode, 200);
    assert.equal(renamed.json().name, "Nova");
    assert.equal(renamed.json().passwordHash, undefined);
    assert.equal((await patch({ email: "new@example.com" })).statusCode, 400);
    assert.equal(
      (await patch({ email: "new@example.com", currentPassword: "wrong" }))
        .statusCode,
      400,
    );
    assert.equal(
      (await patch({ email: "bia@example.com", currentPassword: "secret123" }))
        .statusCode,
      409,
    );
    assert.equal((await patch({ name: "Other", id: "2" })).statusCode, 400);
    assert.equal(
      (await patch({ email: "new@example.com", currentPassword: "secret123" }))
        .statusCode,
      200,
    );
    assert.equal((await repository.findById(2n))?.email, "bia@example.com");
    await repository.update(1n, { active: false });
    assert.equal((await patch({ name: "Inactive" })).statusCode, 403);
  } finally {
    await app.close();
  }
});

test("perfil limita tentativas como senha", async () => {
  const { app } = await passwordApp();
  try {
    const token = (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "ana@example.com", password: "secret123" },
      })
    ).json().accessToken;
    for (let i = 0; i < 6; i++) {
      const result = await app.inject({
        method: "PATCH",
        url: "/auth/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Ana" },
      });
      assert.equal(result.statusCode, i < 5 ? 200 : 429);
    }
  } finally {
    await app.close();
  }
});
