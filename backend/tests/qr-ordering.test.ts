import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
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
  const client: any = {
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
  };

  const service = new QrOrderService(client);
  const result = await service.submit("table-token", {
    customerName: "Ana",
    items: [{ productId: "4", quantity: 2 }],
  });

  assert.equal(result.attendanceId, "12");
  assert.equal(result.order.customerName, "Ana");
  assert.equal(result.order.items[0].unitPrice, "18.50");
  assert.deepEqual(calls, ["lock", "order"]);
});

test("QR account request closes ordering and creates one bill print job", async () => {
  const jobs: any[] = [];
  const client: any = {
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
  };

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
    assert.deepEqual(created.json(), {
      attendanceId: "12",
      order: { id: "21", customerName: "Ana", items: [] },
    });
    const malformed = await app.inject({
      method: "POST",
      url: "/tables/by-token/table-token/orders",
      payload: { items: [] },
    });
    assert.equal(malformed.statusCode, 400);
  } finally {
    await app.close();
  }
});
