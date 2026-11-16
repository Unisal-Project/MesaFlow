import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { createAuthRateLimit } from "../src/modules/auth/auth-rate-limit.js";
import { createValkey, type CounterStore } from "../src/shared/cache/valkey.js";

/** Fake de INCR/PEXPIRE NX/PTTL com relógio controlado. */
function fakeValkey() {
  let now = 0;
  const keys = new Map<string, { count: number; expiresAt?: number }>();
  const live = (key: string) => {
    const entry = keys.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= now)
      keys.delete(key);
    return keys.get(key);
  };
  const store: CounterStore = {
    async incr(key) {
      const entry = live(key) ?? { count: 0 };
      entry.count++;
      keys.set(key, entry);
      return entry.count;
    },
    async pexpire(key, ms, mode) {
      const entry = live(key);
      if (!entry || (mode === "NX" && entry.expiresAt !== undefined)) return 0;
      entry.expiresAt = now + ms;
      return 1;
    },
    async pttl(key) {
      const entry = live(key);
      return entry?.expiresAt === undefined ? -1 : entry.expiresAt - now;
    },
  };
  return { store, keys, advance: (ms: number) => (now += ms) };
}

async function appWith(store: CounterStore | null) {
  const app = Fastify();
  const rateLimit = createAuthRateLimit(store);
  app.post("/auth/login", { onRequest: rateLimit }, async () => ({ ok: true }));
  await app.ready();
  const login = () => app.inject({ method: "POST", url: "/auth/login" });
  return { app, login };
}

test("Valkey: conta por rota+IP e devolve 429 no 6º pedido", async () => {
  const valkey = fakeValkey();
  const { app, login } = await appWith(valkey.store);
  try {
    for (let i = 0; i < 5; i++) assert.equal((await login()).statusCode, 200);
    valkey.advance(20_000);
    const limited = await login();
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.headers["retry-after"], "40");
    assert.deepEqual(limited.json(), {
      message: "Muitas tentativas. Tente novamente em um minuto.",
    });
    assert.deepEqual(
      [...valkey.keys.keys()],
      ["mf:v1:ratelimit:/auth/login:127.0.0.1"],
    );
  } finally {
    await app.close();
  }
});

test("Valkey: a janela expira e libera de novo", async () => {
  const valkey = fakeValkey();
  const { app, login } = await appWith(valkey.store);
  try {
    for (let i = 0; i < 6; i++) await login();
    assert.equal((await login()).statusCode, 429);
    valkey.advance(60_000);
    assert.equal((await login()).statusCode, 200);
  } finally {
    await app.close();
  }
});

test("Valkey com erro: usa a memória sem quebrar e mantém o limite", async () => {
  const broken: CounterStore = {
    incr: async () => {
      throw new Error("Connection is closed.");
    },
    pexpire: async () => 0,
    pttl: async () => -1,
  };
  const { app, login } = await appWith(broken);
  try {
    for (let i = 0; i < 5; i++) assert.equal((await login()).statusCode, 200);
    assert.equal((await login()).statusCode, 429);
  } finally {
    await app.close();
  }
});

test("sem VALKEY_URL: nenhum cliente e o limite roda em memória", async () => {
  assert.equal(createValkey(""), null);
  const { app, login } = await appWith(null);
  try {
    for (let i = 0; i < 5; i++) assert.equal((await login()).statusCode, 200);
    assert.equal((await login()).statusCode, 429);
  } finally {
    await app.close();
  }
});

test("Valkey fora do ar: o cliente real falha rápido e cai na memória", async () => {
  // Porta fechada: sem fila offline, o comando falha na hora (não trava a request).
  const offline = createValkey("redis://127.0.0.1:1")!;
  const { app, login } = await appWith(offline);
  try {
    const started = Date.now();
    for (let i = 0; i < 5; i++) assert.equal((await login()).statusCode, 200);
    assert.equal((await login()).statusCode, 429);
    assert.ok(Date.now() - started < 2_000);
  } finally {
    await app.close();
    (offline as unknown as { disconnect(): void }).disconnect();
  }
});
