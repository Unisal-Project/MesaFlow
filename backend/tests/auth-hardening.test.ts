import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/auth_test";
process.env.JWT_SECRET ??= "auth-hardening-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

const { checkJwtSecret } = await import("../src/config/env.js");
const { AuthService, DUMMY_PASSWORD_HASH } =
  await import("../src/modules/auth/auth.service.js");
const { createLoginLimiter } =
  await import("../src/modules/auth/auth-rate-limit.js");
const { registerAuthRoutes } =
  await import("../src/modules/auth/auth.router.js");
const { errorHandler } = await import("../src/shared/errors/error-handler.js");
const { setSessionUserLoader } = await import("../src/shared/authenticate.js");

test("JWT_SECRET: em produção exige 32 bytes e recusa exemplos", () => {
  const strong = "x".repeat(32);
  assert.equal(checkJwtSecret(strong, "production"), strong);
  for (const weak of [
    "mesaflow",
    "x".repeat(31),
    "development-only-change-me",
    "replace-with-a-long-random-secret",
  ])
    assert.throws(() => checkJwtSecret(weak, "production"), /JWT_SECRET/);
  // Dev/teste mantêm o padrão atual.
  assert.equal(checkJwtSecret("test-jwt-secret", "test"), "test-jwt-secret");
});

test("login sem usuário (ou inativo) também roda o bcrypt", async () => {
  const compared: string[] = [];
  const hasher = {
    createHasher: async () => "hash",
    compareHasher: async (_password: string, hash: string) => {
      compared.push(hash);
      return false;
    },
  };
  const inactive = {
    id: 2n,
    name: "Bia",
    email: "bia@x.com",
    passwordHash: "real-hash",
    role: "EMPLOYEE" as const,
    active: false,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = {
    findByEmail: async (email: string) =>
      email === "bia@x.com" ? inactive : null,
  };
  const service = new AuthService(
    hasher,
    repository as never,
    {} as never,
    () => "token",
  );
  for (const email of ["ninguem@x.com", "bia@x.com"])
    await assert.rejects(service.login(email, "qualquer"), {
      statusCode: 401,
      message: "E-mail ou senha inválidos",
    });
  assert.deepEqual(compared, [DUMMY_PASSWORD_HASH, "real-hash"]);
});

/** Valkey falso com os comandos que o limitador usa. */
function fakeValkey() {
  const data = new Map<string, number>();
  return {
    data,
    incr: async (key: string) => {
      data.set(key, (data.get(key) ?? 0) + 1);
      return data.get(key)!;
    },
    pexpire: async () => 1,
    pttl: async () => 60_000,
    get: async (key: string) => (data.has(key) ? String(data.get(key)) : null),
    del: async (key: string) => Number(data.delete(key)),
  };
}

for (const [name, store] of [
  ["memória", null],
  ["Valkey", fakeValkey()],
] as const)
  test(`limite por IP+e-mail conta na chegada; sucesso zera (${name})`, async () => {
    const limiter = createLoginLimiter(store);
    for (let i = 0; i < 5; i++)
      assert.equal(await limiter.attempt("1.1.1.1", "Ana@X.com "), 0);
    // Login certo apaga o contador do e-mail: não consome o limite.
    await limiter.succeed("1.1.1.1", "ana@x.com");
    for (let i = 0; i < 5; i++)
      assert.equal(await limiter.attempt("1.1.1.1", "ana@x.com"), 0);
    assert.ok((await limiter.attempt("1.1.1.1", "ana@x.com")) > 0);
    // Outro e-mail e outro IP seguem livres.
    assert.equal(await limiter.attempt("1.1.1.1", "bia@x.com"), 0);
    assert.equal(await limiter.attempt("2.2.2.2", "ana@x.com"), 0);
  });

test("teto por IP conta qualquer tentativa, inclusive as certas", async () => {
  const limiter = createLoginLimiter(null);
  for (let i = 0; i < 30; i++) {
    assert.equal(await limiter.attempt("9.9.9.9", "ana@x.com"), 0);
    await limiter.succeed("9.9.9.9", "ana@x.com");
  }
  assert.ok((await limiter.attempt("9.9.9.9", "novo@x.com")) > 0);
  assert.equal(await limiter.attempt("8.8.8.8", "novo@x.com"), 0);
});

const user = {
  id: 1n,
  name: "Ana",
  email: "ana@x.com",
  passwordHash: "ok",
  role: "ADMIN" as const,
  active: true,
  tokenVersion: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};
let compares = 0;
const { BcryptPasswordHasher } =
  await import("../src/config/hash/bcrypt-password-hasher.js");
// bcrypt real é lento; aqui a senha "certa" é a palavra "certa" e o compare
// demora um pouco, como o bcrypt, para a rajada se sobrepor de verdade.
BcryptPasswordHasher.prototype.compareHasher = async (password: string) => {
  compares++;
  await new Promise((resolve) => setTimeout(resolve, 20));
  return password === "certa";
};

async function loginApp(store: Parameters<typeof createLoginLimiter>[0]) {
  setSessionUserLoader(async () => user);
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.register(registerAuthRoutes, {
    repository: {
      findByEmail: async (email: string) =>
        email === user.email ? user : null,
      findById: async () => user,
    } as never,
    loginLimiter: createLoginLimiter(store),
  });
  const login = (password: string) =>
    app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@x.com", password },
    });
  return { app, login };
}

for (const [name, store] of [
  ["memória", null],
  ["Valkey", fakeValkey()],
] as const)
  test(`rajada paralela: no máximo 5 tentativas chegam ao bcrypt (${name})`, async () => {
    const { app, login } = await loginApp(store);
    compares = 0;
    try {
      const responses = await Promise.all(
        Array.from({ length: 25 }, () => login("errada")),
      );
      const codes = responses.map((response) => response.statusCode);
      assert.equal(compares, 5);
      assert.equal(codes.filter((code) => code === 401).length, 5);
      assert.equal(codes.filter((code) => code === 429).length, 20);
    } finally {
      await app.close();
    }
  });

test("POST /auth/login: certos não consomem o limite do e-mail; 5 errados bloqueiam", async () => {
  const { app, login } = await loginApp(null);
  try {
    for (let i = 0; i < 10; i++)
      assert.equal((await login("certa")).statusCode, 200);
    const ok = await login("certa");
    assert.equal(app.jwt.verify<{ tv: number }>(ok.json().accessToken).tv, 3);
    for (let i = 0; i < 5; i++)
      assert.equal((await login("errada")).statusCode, 401);
    const blocked = await login("certa");
    assert.equal(blocked.statusCode, 429);
    assert.ok(Number(blocked.headers["retry-after"]) > 0);
  } finally {
    await app.close();
  }
});

test("login recusa e-mail > 180 e senha > 128 caracteres (400)", async () => {
  const { app } = await loginApp(null);
  try {
    for (const payload of [
      { email: `${"a".repeat(175)}@x.com`, password: "certa" },
      { email: "ana@x.com", password: "x".repeat(129) },
    ])
      assert.equal(
        (await app.inject({ method: "POST", url: "/auth/login", payload }))
          .statusCode,
        400,
      );
  } finally {
    await app.close();
  }
});
