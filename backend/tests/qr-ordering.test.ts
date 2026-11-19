import assert from "node:assert/strict";
import { withDailyNumber } from "./helpers/daily-number.js";
import "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { errorHandler } from "../src/shared/errors/error-handler.js";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/qr_ordering_test";
process.env.JWT_SECRET ??= "qr-ordering-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { QrOrderService } =
  await import("../src/modules/tables/qr-order.service.js");
const { QrOrderController } =
  await import("../src/modules/tables/qr-order.controller.js");

test("first QR order opens the table attendance and stores the customer name", async () => {
  const calls: string[] = [];
  const client: any = withDailyNumber({
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => {
      calls.push("lock");
    },
    restaurantTable: {
      findUnique: async () => ({ id: 7n, active: true }),
    },
    attendance: {
      findFirst: async () => null,
      create: async () => ({ id: 12n, status: "OPEN" }),
    },
    product: {
      findMany: async () => [{ id: 4n, price: { toString: () => "18.50" } }],
      updateMany: async ({ where, data }: any) => {
        calls.push(
          `stock ${data.stockQuantity.increment} if >= ${where.stockQuantity.gte}`,
        );
        return { count: 1 };
      },
    },
    stockMovement: {
      create: async ({ data }: any) => {
        calls.push(`${data.type} ${data.quantity}`);
      },
    },
    printJob: {
      create: async ({ data }: any) => {
        assert.deepEqual(data, { orderId: 21n, type: "ORDER" });
        calls.push("print");
      },
    },
    order: {
      create: async ({ data }: any) => {
        calls.push("order");
        return {
          id: 21n,
          attendanceId: data.attendanceId,
          customerName: data.customerName,
          notes: data.notes ?? null,
          items: [
            {
              id: 31n,
              orderId: 21n,
              productId: 4n,
              quantity: 2,
              unitPrice: { toString: () => "18.50" },
              notes: null,
            },
          ],
        };
      },
    },
  });

  const service = new QrOrderService(client);
  const result = await service.submit("table-token", {
    customerName: "Ana",
    items: [{ productId: "4", quantity: 2 }],
  });

  assert.equal(result.attendanceId, "12");
  assert.equal(result.order.customerName, "Ana");
  assert.equal(result.order.items[0].unitPrice, "18.50");
  assert.deepEqual(calls, [
    "lock",
    "order",
    "stock -2 if >= 2",
    "SALE -2",
    "print",
  ]);
});

test("QR order without enough stock is rejected", async () => {
  const client: any = withDailyNumber({
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => undefined,
    restaurantTable: { findUnique: async () => ({ id: 7n, active: true }) },
    attendance: { findFirst: async () => ({ id: 12n, status: "OPEN" }) },
    product: {
      findMany: async () => [{ id: 4n, price: { toString: () => "18.50" } }],
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => ({ name: "Suco", stockQuantity: 1 }),
    },
    order: {
      create: async () => ({
        id: 21n,
        attendanceId: 12n,
        items: [{ id: 31n, productId: 4n, quantity: 2 }],
      }),
    },
  });
  await assert.rejects(
    new QrOrderService(client).submit("table-token", {
      customerName: "Ana",
      items: [{ productId: "4", quantity: 2 }],
    }),
    /Estoque insuficiente para Suco \(disponível: 1\)/,
  );
});

test("QR account request closes ordering and creates one bill print job", async () => {
  const jobs: any[] = [];
  const client: any = withDailyNumber({
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => undefined,
    restaurantTable: { findUnique: async () => ({ id: 7n, active: true }) },
    attendance: {
      findFirst: async () => ({ id: 12n, status: "OPEN" }),
      updateMany: async () => ({ count: 1 }),
    },
    printJob: {
      create: async ({ data }: any) => {
        jobs.push(data);
      },
    },
  });

  const result = await new QrOrderService(client).requestClosing("table-token");

  assert.deepEqual(result, { attendanceId: "12", status: "closing_requested" });
  assert.deepEqual(jobs, [{ attendanceId: 12n, type: "BILL" }]);
});

test("QR order endpoint validates the customer and returns the created order", async () => {
  const service = {
    submit: async (token: string, data: any) => ({
      attendanceId: "12",
      order: { id: "21", customerName: data.customerName, items: [] },
    }),
    requestClosing: async () => ({
      attendanceId: "12",
      status: "closing_requested",
    }),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "qr-ordering-test-secret" });
  const controller = new QrOrderController(service as any);
  app.post("/tables/by-token/:token/orders", (request, reply) =>
    controller.submit(request, reply),
  );
  try {
    const created = await app.inject({
      method: "POST",
      url: "/tables/by-token/table-token/orders",
      payload: {
        customerName: "Ana",
        items: [{ productId: "4", quantity: 1 }],
      },
    });
    assert.equal(created.statusCode, 201);
    const { paymentSession, ...order } = created.json();
    assert.deepEqual(order, {
      attendanceId: "12",
      order: { id: "21", customerName: "Ana", items: [] },
    });
    const claims = app.jwt.verify<{ purpose: string; attendanceId: string }>(
      paymentSession,
    );
    assert.equal(claims.purpose, "customer-payment-confirmation");
    assert.equal(claims.attendanceId, "12");
    const malformed = await app.inject({
      method: "POST",
      url: "/tables/by-token/table-token/orders",
      payload: { items: [] },
    });
    assert.equal(malformed.statusCode, 400);
    const tooMany = await app.inject({
      method: "POST",
      url: "/tables/by-token/table-token/orders",
      payload: {
        customerName: "Ana",
        items: [{ productId: "4", quantity: 100 }],
      },
    });
    assert.equal(tooMany.statusCode, 400);
    const overLimit = await app.inject({
      method: "POST",
      url: "/tables/by-token/table-token/orders",
      payload: {
        customerName: "Ana",
        items: Array.from({ length: 101 }, () => ({
          productId: "4",
          quantity: 1,
        })),
      },
    });
    assert.equal(overLimit.statusCode, 400);
    assert.equal(
      overLimit.json().issues[0].message,
      "Limite de 100 itens por pedido",
    );
  } finally {
    await app.close();
  }
});

test("bill query contains consumption without order tracking and excludes cancelled orders", async () => {
  const client: any = withDailyNumber({
    restaurantTable: { findUnique: async () => ({ id: 7n, active: true }) },
    attendance: { findFirst: async () => ({ id: 12n, status: "OPEN" }) },
    order: {
      findMany: async ({ where }: any) => {
        assert.deepEqual(where, {
          attendanceId: 12n,
          status: { not: "CANCELLED" },
        });
        return [
          {
            id: 21n,
            dailyNumber: 27,
            businessDate: new Date("2026-11-17T00:00:00Z"),
            items: [
              {
                id: 31n,
                productId: 4n,
                product: { name: "Suco" },
                quantity: 2,
                unitPrice: "18.50",
                notes: null,
              },
            ],
          },
        ];
      },
    },
  });
  const result = await new QrOrderService(client).findBill("table-token");
  assert.deepEqual(result, {
    attendanceId: "12",
    attendanceStatus: "OPEN",
    items: [
      {
        id: "31",
        dailyNumber: 27,
        businessDate: "2026-11-17",
        productId: "4",
        productName: "Suco",
        quantity: 2,
        unitPrice: "18.50",
        notes: null,
      },
    ],
  });
});

test("bill of a free table has no consumption", async () => {
  const client: any = withDailyNumber({
    restaurantTable: { findUnique: async () => ({ id: 7n, active: true }) },
    attendance: { findFirst: async () => null },
  });
  assert.deepEqual(await new QrOrderService(client).findBill("table-token"), {
    attendanceId: null,
    attendanceStatus: null,
    items: [],
  });
});

test("public bill route replaces the old tracking route", async (t) => {
  const { tableRoutes } =
    await import("../src/modules/tables/table.routers.js");
  const { requireApiAuthentication } =
    await import("../src/shared/api-access.js");
  const bill = { attendanceId: null, attendanceStatus: null, items: [] };
  t.mock.method(QrOrderService.prototype, "findBill", async (token: string) => {
    assert.equal(token, "table-token");
    return bill;
  });
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      tableRoutes(api);
    },
    { prefix: "/api/v1" },
  );
  try {
    const response = await app.inject(
      "/api/v1/tables/by-token/table-token/bill",
    );
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), bill);
    assert.equal(response.headers["cache-control"], "no-store");
    const old = await app.inject("/api/v1/tables/by-token/table-token/orders");
    assert.equal(old.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("pedido QR cobra o preço promocional calculado no servidor", async () => {
  let charged: unknown;
  const client: any = withDailyNumber({
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => undefined,
    restaurantTable: { findUnique: async () => ({ id: 7n, active: true }) },
    attendance: { findFirst: async () => ({ id: 12n, status: "OPEN" }) },
    product: {
      findMany: async () => [
        {
          id: 4n,
          price: "18.50",
          promoType: "AMOUNT",
          promoValue: "3.50",
          promoActive: true,
          promoStartsAt: null,
          promoEndsAt: null,
        },
      ],
      updateMany: async () => ({ count: 1 }),
    },
    stockMovement: { create: async () => undefined },
    printJob: { create: async () => undefined },
    order: {
      create: async ({ data }: any) => {
        charged = data.items.create[0].unitPrice;
        return {
          id: 21n,
          attendanceId: 12n,
          customerName: "Ana",
          notes: null,
          items: [
            {
              id: 31n,
              orderId: 21n,
              productId: 4n,
              quantity: 1,
              unitPrice: charged,
              notes: null,
            },
          ],
        };
      },
    },
  });
  await new QrOrderService(client).submit("table-token", {
    customerName: "Ana",
    items: [{ productId: "4", quantity: 1 }],
  });
  assert.equal(charged, "15.00");
});
