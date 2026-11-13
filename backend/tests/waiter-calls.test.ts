import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { requireApiAuthentication } from "../src/shared/api-access.js";
import { errorHandler } from "../src/shared/errors/error-handler.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET ??= "waiter-test-secret";
process.env.FRONTEND_URL ??= "http://localhost:5173";
const { WaiterCallService } =
  await import("../src/modules/tables/waiter-call.service.js");
const { waiterCallRoutes } =
  await import("../src/modules/tables/waiter-call.routes.js");

function fixture() {
  let active = true;
  let fail = false;
  let locked = false;
  const calls: any[] = [];
  let queue = Promise.resolve();
  const table = { id: 1n, number: 7 };
  const tx: any = {
    $queryRaw: async (sql: TemplateStringsArray) => {
      assert.match(sql.join("?"), /WHERE qr_token = \? FOR UPDATE/);
      locked = true;
    },
    restaurantTable: {
      findUnique: async ({ where }: any) => {
        assert.ok(locked);
        if (fail) throw Error("database unavailable");
        return where.qrToken === "valid-token" ? { ...table, active } : null;
      },
    },
    waiterCall: {
      findFirst: async () => {
        assert.ok(locked);
        return calls.find((call) => call.status === "PENDING") ?? null;
      },
      create: async () => {
        assert.ok(locked);
        const call = {
          id: BigInt(calls.length + 1),
          tableId: 1n,
          table: { number: 7 },
          status: "PENDING",
          createdAt: new Date(),
          attendedAt: null,
        };
        calls.push(call);
        return call;
      },
      findMany: async () => calls.filter((call) => call.status === "PENDING"),
      updateMany: async ({ where, data }: any) => {
        const call = calls.find(
          (call) => call.id === where.id && call.status === where.status,
        );
        if (call) Object.assign(call, data);
        return { count: call ? 1 : 0 };
      },
      findUnique: async ({ where }: any) =>
        calls.find((call) => call.id === where.id) ?? null,
    },
  };
  const db: any = {
    waiterCall: tx.waiterCall,
    $transaction: (work: any) => {
      const result = queue.then(async () => {
        locked = false;
        return work(tx);
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  return {
    service: new WaiterCallService(db),
    calls,
    disable: () => {
      active = false;
    },
    fail: () => {
      fail = true;
    },
  };
}

test("chamadas simultâneas são idempotentes; atendimento permite nova chamada", async () => {
  const { service, calls } = fixture();
  const results = await Promise.all(
    Array.from({ length: 10 }, () => service.call("valid-token")),
  );
  assert.equal(calls.length, 1);
  assert.ok(results.every((call) => call.id === results[0]!.id));
  assert.equal((await service.pending()).length, 1);
  const attended = await service.attend(1n);
  assert.equal(attended.status, "ATTENDED");
  assert.ok(attended.attendedAt);
  assert.deepEqual(await service.attend(1n), attended);
  assert.deepEqual(await service.pending(), []);
  await service.call("valid-token");
  assert.equal(calls.length, 2);
});

test("QR inválido e mesa inativa não geram solicitações", async () => {
  const f = fixture();
  await assert.rejects(f.service.call("unknown"), { statusCode: 404 });
  f.disable();
  await assert.rejects(f.service.call("valid-token"), { statusCode: 404 });
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.service.attend(999n), { statusCode: 404 });
});

test("rotas: chamada pública, validação, JWT obrigatório e erros sem sucesso falso", async () => {
  const f = fixture();
  const app = Fastify();
  await app.register(fastifyJwt, { secret: "waiter-tests" });
  app.setErrorHandler(errorHandler);
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      waiterCallRoutes(api, f.service);
    },
    { prefix: "/api/v1" },
  );
  try {
    const call = await app.inject({
      method: "POST",
      url: "/api/v1/tables/by-token/valid-token/call-waiter",
    });
    assert.equal(call.statusCode, 200);
    assert.equal(call.json().status, "PENDING");
    assert.equal(call.headers["cache-control"], "no-store");
    for (const [method, url] of [
      ["GET", "/api/v1/waiter-calls"],
      ["PATCH", "/api/v1/waiter-calls/1/attend"],
    ] as const) {
      assert.equal((await app.inject({ method, url })).statusCode, 401);
      assert.equal(
        (
          await app.inject({
            method,
            url,
            headers: { authorization: "Bearer invalid" },
          })
        ).statusCode,
        401,
      );
    }
    const headers = {
      authorization: `Bearer ${app.jwt.sign({ id: "1", email: "admin@example.com", role: "ADMIN" })}`,
    };
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/api/v1/waiter-calls",
          headers,
        })
      ).json().length,
      1,
    );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/v1/waiter-calls/0/attend",
          headers,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/v1/waiter-calls/1/attend",
          headers,
        })
      ).json().status,
      "ATTENDED",
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/tables/by-token/${"x".repeat(121)}/call-waiter`,
        })
      ).statusCode,
      414,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/tables/by-token/unknown/call-waiter",
        })
      ).statusCode,
      404,
    );
    f.fail();
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/tables/by-token/valid-token/call-waiter",
        })
      ).statusCode,
      500,
    );
  } finally {
    await app.close();
  }
});

test(
  "MariaDB: unicidade persistida e chamadas simultâneas reais",
  { skip: process.env.RUN_WAITER_DB_TESTS !== "1" },
  async () => {
    const { randomUUID, randomInt } = await import("node:crypto");
    const { PrismaConnector: db } = await import("../src/database/prisma.js");
    const service = new WaiterCallService(db);
    const token = randomUUID();
    let tableId: bigint | undefined;
    try {
      const table = await db.restaurantTable.create({
        data: {
          number: randomInt(2_000_000_000, 4_000_000_000),
          qrToken: token,
        },
      });
      tableId = table.id;
      const calls = await Promise.all(
        Array.from({ length: 8 }, () => service.call(token)),
      );
      assert.equal(new Set(calls.map((call) => call.id)).size, 1);
      assert.equal(
        await db.waiterCall.count({ where: { tableId, status: "PENDING" } }),
        1,
      );
      // A restrição funciona mesmo quando uma escrita não passa pelo serviço.
      await assert.rejects(db.waiterCall.create({ data: { tableId } }), {
        code: "P2002",
      });
      await service.attend(BigInt(calls[0]!.id));
      const next = await service.call(token);
      assert.notEqual(next.id, calls[0]!.id);
      assert.equal(await db.waiterCall.count({ where: { tableId } }), 2);
      await db.restaurantTable.update({
        where: { id: tableId },
        data: { active: false },
      });
      await assert.rejects(service.call(token), { statusCode: 404 });
    } finally {
      if (tableId) {
        await db.waiterCall.deleteMany({ where: { tableId } });
        await db.restaurantTable.delete({ where: { id: tableId } });
      }
      await db.$disconnect();
    }
  },
);
