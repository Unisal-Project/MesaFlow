import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { errorHandler } from "../src/shared/errors/error-handler.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/scale_test";
process.env.JWT_SECRET ??= "scale-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { moveItemsStock } = await import("../src/modules/orders/stock.js");
const { PrismaAdminOrderRepository } =
  await import("../src/modules/orders/repositories/prisma-admin-order.repository.js");
const { adminOrderRoutes } =
  await import("../src/modules/orders/admin-order.controller.js");
const { AttendanceService } =
  await import("../src/modules/attendance/attendance.service.js");

test("B13: o estoque é debitado UMA vez por produto, em ordem de productId", async () => {
  const updates: { id: bigint; change: number }[] = [];
  const movements: any[] = [];
  const tx: any = {
    product: {
      updateMany: async ({ where, data }: any) => {
        updates.push({ id: where.id, change: data.stockQuantity.increment });
        return { count: 1 };
      },
    },
    stockMovement: { create: async ({ data }: any) => movements.push(data) },
  };
  // O carrinho cria 1 linha por unidade: 3× produto 5 e 1× produto 2.
  const items = [
    { id: 11n, productId: 5n, quantity: 1 },
    { id: 12n, productId: 5n, quantity: 1 },
    { id: 13n, productId: 2n, quantity: 1 },
    { id: 14n, productId: 5n, quantity: 1 },
  ];
  await moveItemsStock(tx, items, -1, {
    type: "SALE",
    orderId: 9n,
    userId: null,
  });
  assert.deepEqual(updates, [
    { id: 2n, change: -1 },
    { id: 5n, change: -3 },
  ]);
  // Movimento com o orderItemId do 1º item de cada produto.
  assert.deepEqual(
    movements.map((m) => [m.productId, m.quantity, m.orderItemId, m.type]),
    [
      [2n, -1, 13n, "SALE"],
      [5n, -3, 11n, "SALE"],
    ],
  );
  // Devolução (cancelamento) usa o mesmo agrupamento.
  updates.length = 0;
  await moveItemsStock(tx, items, 1, {
    type: "CANCELLATION",
    orderId: 9n,
    userId: 1n,
  });
  assert.deepEqual(updates, [
    { id: 2n, change: 1 },
    { id: 5n, change: 3 },
  ]);
});

test("B12: cancelados só das últimas 48 h e no máximo 100", async () => {
  let limit: any;
  const service = new AttendanceService(
    {
      findAllByStatus: async (_status: string, options: any) => {
        limit = options;
        return [];
      },
    } as any,
    {} as any,
  );
  const before = Date.now();
  await service.findCancelledAttendances();
  assert.equal(limit.take, 100);
  const hours = (before - limit.since.getTime()) / 3_600_000;
  assert.ok(hours >= 47.9 && hours <= 48.1);
});

test("B11: janela operacional = contas abertas + hoje/ontem + fechadas há 48 h", async () => {
  const client: any = {
    restaurantSettings: {
      findUnique: async () => ({
        timezone: "America/Sao_Paulo",
        dayCutoffHour: 5,
      }),
    },
  };
  // 04:00 em São Paulo do dia 18 ainda é o dia de operação 17 → ontem = 16.
  const now = new Date("2026-11-18T07:00:00Z");
  const where: any = await new PrismaAdminOrderRepository(
    client,
  ).operationalWhere(now);
  assert.deepEqual(where.OR[0], {
    attendance: {
      status: { in: ["OPEN", "CLOSING_REQUESTED", "AWAITING_PAYMENT"] },
    },
  });
  assert.equal(
    where.OR[1].businessDate.gte.toISOString(),
    "2026-11-16T00:00:00.000Z",
  );
  assert.equal(
    where.OR[2].attendance.closedAt.gte.toISOString(),
    "2026-11-16T07:00:00.000Z",
  );
});

test("B11: GET /orders mantém o contrato e aceita scope/view opcionais", async () => {
  const calls: string[] = [];
  const record = {
    id: 5n,
    dailyNumber: 3,
    businessDate: new Date("2026-11-17T00:00:00Z"),
    status: "PENDING",
    createdAt: new Date("2026-11-17T15:00:00Z"),
    attendance: {
      id: 8n,
      status: "OPEN",
      table: { id: 2n, number: 4, name: null },
    },
  };
  const repository: any = {
    findSince: async (since: Date) => {
      calls.push(
        `since ${Math.round((Date.now() - since.getTime()) / 86_400_000)}`,
      );
      return [];
    },
    findOperational: async () => {
      calls.push("operational");
      return [];
    },
    operationalWhere: async () => ({ marker: true }),
    findSummary: async (where: any) => {
      calls.push(`summary ${JSON.stringify(where)}`);
      return [record];
    },
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(adminOrderRoutes, { repository });
  try {
    await app.inject("/orders");
    await app.inject("/orders?days=2");
    await app.inject("/orders?scope=operational");
    const summary = await app.inject("/orders?view=summary&scope=operational");
    assert.deepEqual(calls.slice(0, 3), ["since 90", "since 2", "operational"]);
    assert.equal(calls[3], 'summary {"marker":true}');
    assert.deepEqual(summary.json(), [
      {
        id: "5",
        dailyNumber: 3,
        businessDate: "2026-11-17",
        status: "PENDING",
        createdAt: "2026-11-17T15:00:00.000Z",
        table: { id: "2", number: 4, name: null },
        attendance: { id: "8", status: "OPEN" },
      },
    ]);
    assert.equal((await app.inject("/orders?scope=tudo")).statusCode, 400);
  } finally {
    await app.close();
  }
});
