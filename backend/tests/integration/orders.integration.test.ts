import assert from "node:assert/strict";
import { test, before, after, beforeEach, afterEach } from "node:test";
import type { FastifyInstance } from "fastify";

import { createTestApp } from "./helpers/app.js";
import { db, disconnectDatabase, cleanupTable } from "./helpers/database.js";
import {
  createTable,
  createCategory,
  createProduct,
} from "./helpers/fixtures.js";
import { createAuthenticatedUser } from "./helpers/auth.js";

const BASE_URL = "/api/v1";

let app: FastifyInstance;
let userId: bigint;
let tableId: bigint;
let categoryId: bigint;
let productId: bigint;
let qrToken: string;
let headers: { authorization: string };

before(async () => {
  app = await createTestApp();

  const authenticated = await createAuthenticatedUser(app);

  userId = authenticated.user.id;
  headers = authenticated.headers;
});

beforeEach(async () => {
  const table = await createTable();
  tableId = table.id;
  qrToken = table.qrToken;

  const category = await createCategory();
  categoryId = category.id;

  const product = await createProduct(categoryId);
  productId = product.id;
});

afterEach(async () => {
  await cleanupTable(tableId);

  await db.product.delete({
    where: { id: productId },
  });

  await db.category.delete({
    where: { id: categoryId },
  });
});

after(async () => {
  try {
    if (userId !== undefined) {
      await db.user.delete({
        where: { id: userId },
      });
    }
  } finally {
    try {
      await app?.close();
    } finally {
      await disconnectDatabase();
    }
  }
});

function submitOrder(quantity = 2) {
  return app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/${tableId}/orders`,
    headers,
    payload: {
      items: [
        {
          productId: productId.toString(),
          quantity,
        },
      ],
    },
  });
}

async function getStock() {
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
  });

  return product.stockQuantity;
}

async function createOrder(quantity = 2) {
  const response = await submitOrder(quantity);

  assert.equal(response.statusCode, 201, response.body);

  return response.json();
}

test("creates an order and opens an attendance", async () => {
  const order = await createOrder(2);
  const orderId = BigInt(order.id);

  assert.equal(order.status, "PENDING");
  assert.equal(order.attendance.status, "OPEN");
  assert.equal(order.table.id, tableId.toString());

  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 2);
  assert.equal(Number(order.items[0].unitPrice), 10);

  const stored = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      attendance: true,
    },
  });

  assert.equal(stored.attendance.tableId, tableId);
  assert.equal(stored.items[0].productId, productId);
  assert.equal(stored.items[0].quantity, 2);

  assert.equal(await getStock(), 98);

  const movement = await db.stockMovement.findFirstOrThrow({
    where: {
      orderId,
      type: "SALE",
    },
  });

  assert.equal(movement.quantity, -2);

  assert.equal(
    await db.printJob.count({
      where: { orderId, type: "ORDER" },
    }),
    1,
  );
});

test("lists orders by attendance", async () => {
  const order = await createOrder();

  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/attendances/${order.attendance.id}/orders`,
    headers,
  });

  assert.equal(response.statusCode, 200);

  const orders = response.json();

  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, order.id);
  assert.equal(orders[0].items.length, 1);
});

test("updates order items and adjusts stock", async () => {
  const order = await createOrder(2);

  const response = await app.inject({
    method: "PUT",
    url: `${BASE_URL}/orders/${order.id}/items`,
    headers,
    payload: {
      items: [
        {
          productId: productId.toString(),
          quantity: 5,
        },
      ],
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().items[0].quantity, 5);

  assert.equal(await getStock(), 95);

  const movement = await db.stockMovement.findFirstOrThrow({
    where: {
      orderId: BigInt(order.id),
      type: "ADJUSTMENT",
    },
  });

  assert.equal(movement.quantity, -3);
});

test("cancels an order and restores stock", async () => {
  const order = await createOrder(2);

  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/orders/${order.id}/cancel`,
    headers,
    payload: {
      reason: "Integration test cancellation",
      restoreStock: true,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "CANCELLED");

  assert.equal(await getStock(), 100);

  const movement = await db.stockMovement.findFirstOrThrow({
    where: {
      orderId: BigInt(order.id),
      type: "CANCELLATION",
    },
  });

  assert.equal(movement.quantity, 2);
});

test("cancels an order without restoring stock", async () => {
  const order = await createOrder(2);

  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/orders/${order.id}/cancel`,
    headers,
    payload: {
      reason: "Product already prepared",
      restoreStock: false,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "CANCELLED");

  assert.equal(await getStock(), 98);

  assert.equal(
    await db.stockMovement.count({
      where: {
        orderId: BigInt(order.id),
        type: "CANCELLATION",
      },
    }),
    0,
  );
});

test("rejects duplicate cancellation", async () => {
  const order = await createOrder(2);

  const cancel = () =>
    app.inject({
      method: "POST",
      url: `${BASE_URL}/orders/${order.id}/cancel`,
      headers,
      payload: {
        reason: "Integration test cancellation",
        restoreStock: true,
      },
    });

  assert.equal((await cancel()).statusCode, 200);
  assert.equal((await cancel()).statusCode, 409);

  assert.equal(await getStock(), 100);

  assert.equal(
    await db.stockMovement.count({
      where: {
        orderId: BigInt(order.id),
        type: "CANCELLATION",
      },
    }),
    1,
  );
});

test("rejects insufficient stock and rolls back changes", async () => {
  const response = await submitOrder(101);

  assert.equal(response.statusCode, 409);

  assert.match(response.json().message, /Estoque insuficiente/);

  assert.equal(await getStock(), 100);

  assert.equal(
    await db.attendance.count({
      where: { tableId },
    }),
    0,
  );

  assert.equal(
    await db.orderItem.count({
      where: { productId },
    }),
    0,
  );

  assert.equal(
    await db.stockMovement.count({
      where: { productId },
    }),
    0,
  );
});

test("rejects unavailable products", async () => {
  await db.product.update({
    where: { id: productId },
    data: { available: false },
  });

  const response = await submitOrder();

  assert.equal(response.statusCode, 409);
  assert.equal(await getStock(), 100);

  assert.equal(
    await db.attendance.count({
      where: { tableId },
    }),
    0,
  );
});

test("rejects invalid order quantities", async () => {
  const response = await submitOrder(0);

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().message, "Dados inválidos");

  assert.equal(await getStock(), 100);
});

test("requires authentication to create admin orders", async () => {
  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/${tableId}/orders`,
    payload: {
      items: [
        {
          productId: productId.toString(),
          quantity: 2,
        },
      ],
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(await getStock(), 100);
});

test("creates a customer order through the QR token", async () => {
  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/by-token/${qrToken}/orders`,
    payload: {
      customerName: "Integration Test Customer",
      items: [
        {
          productId: productId.toString(),
          quantity: 3,
        },
      ],
    },
  });

  assert.equal(response.statusCode, 201, response.body);

  const stored = await db.order.findFirstOrThrow({
    where: {
      attendance: { tableId },
    },
    include: {
      items: true,
      attendance: true,
    },
  });

  assert.equal(stored.customerName, "Integration Test Customer");
  assert.equal(stored.attendance.status, "OPEN");
  assert.equal(stored.items[0].quantity, 3);
  assert.equal(await getStock(), 97);
});
