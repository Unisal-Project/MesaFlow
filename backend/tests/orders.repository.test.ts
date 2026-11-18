import assert from "node:assert/strict";
import { withDailyNumber } from "./helpers/daily-number.js";
import { test } from "node:test";
process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/orders_test";
process.env.JWT_SECRET ??= "orders-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { PrismaOrderRepository } =
  await import("../src/modules/orders/repositories/prisma-order.repository.js");
const input = {
  attendanceId: 12n,
  items: [{ productId: 4n, quantity: 2, unitPrice: "18.50" }],
};

function fixture(status = "OPEN") {
  const calls: string[] = [];
  const client: any = withDailyNumber({
    $transaction: async (callback: any) => {
      calls.push("transaction");
      return callback(client);
    },
    attendance: { findUnique: async () => ({ tableId: 7n }) },
    $queryRaw: async (sql: TemplateStringsArray) => {
      if (sql.join("").includes("restaurant_tables")) {
        calls.push("table lock");
        return [{ id: 7n }];
      }
      calls.push("attendance lock");
      return [{ id: 12n, status }];
    },
    order: {
      create: async ({ data }: any) => {
        calls.push("order");
        return {
          id: 21n,
          attendanceId: 12n,
          status: "PENDING",
          items: data.items.create.map((item: any) => ({
            id: 31n,
            orderId: 21n,
            ...item,
          })),
        };
      },
    },
    product: {
      updateMany: async () => {
        calls.push("stock");
        return { count: 1 };
      },
    },
    stockMovement: {
      create: async () => {
        calls.push("movement");
      },
    },
    printJob: {
      create: async () => {
        calls.push("print");
      },
    },
  });
  return { client, calls, repository: new PrismaOrderRepository(client) };
}

test("legacy order endpoint rechecks attendance under lock and rejects an already closed account", async () => {
  const { repository, calls } = fixture("CLOSED");
  await assert.rejects(repository.create(input), { statusCode: 409 });
  assert.deepEqual(calls, ["transaction", "table lock", "attendance lock"]);
});

test("legacy order creation debits stock and queues printing in the same locked transaction", async () => {
  const { repository, calls } = fixture();
  const result = await repository.create(input);
  assert.equal(result.order.id, 21n);
  assert.deepEqual(calls, [
    "transaction",
    "table lock",
    "attendance lock",
    "order",
    "stock",
    "movement",
    "print",
  ]);
});
