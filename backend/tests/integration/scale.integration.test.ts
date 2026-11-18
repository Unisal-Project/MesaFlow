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

// Lote 3 da investigação de bugs (nota 26): lista operacional (B11), cancelados
// com janela (B12), débito de estoque agrupado (B13), relatório por dia de
// operação (B09) e ranking por productId (B14).
const BASE_URL = "/api/v1";

let app: FastifyInstance;
let userId: bigint;
let tableId: bigint;
let categoryId: bigint;
let productId: bigint;
let headers: { authorization: string };

before(async () => {
  app = await createTestApp();
  const authenticated = await createAuthenticatedUser(app);
  userId = authenticated.user.id;
  headers = authenticated.headers;
});

beforeEach(async () => {
  tableId = (await createTable()).id;
  categoryId = (await createCategory()).id;
  productId = (await createProduct(categoryId)).id;
});

afterEach(async () => {
  await cleanupTable(tableId);
  await db.product.delete({ where: { id: productId } });
  await db.category.delete({ where: { id: categoryId } });
});

after(async () => {
  try {
    if (userId !== undefined) await db.user.delete({ where: { id: userId } });
  } finally {
    try {
      await app?.close();
    } finally {
      await disconnectDatabase();
    }
  }
});

type OrderPayload = { productId: string; quantity: number; notes?: string }[];

async function createOrder(items?: OrderPayload) {
  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/tables/${tableId}/orders`,
    headers,
    payload: {
      items: items ?? [{ productId: productId.toString(), quantity: 2 }],
    },
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json();
}

async function closeAccount(attendanceId: string) {
  // 2 unidades de R$ 10,00 + 10% de taxa de serviço (padrão do banco).
  const response = await app.inject({
    method: "POST",
    url: `${BASE_URL}/attendances/${attendanceId}/close`,
    headers,
    payload: {
      serviceFeeWaived: false,
      payments: [{ method: "PIX", amount: 22 }],
    },
  });
  assert.equal(response.statusCode, 200, response.body);
}

const list = async (query: string) => {
  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/orders${query}`,
    headers,
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json() as { id: string; items?: unknown }[];
};

test("B13: carrinho com 1 linha por unidade debita e devolve estoque em UM movimento", async () => {
  const id = productId.toString();
  const order = await createOrder([
    { productId: id, quantity: 1, notes: "a" },
    { productId: id, quantity: 1, notes: "b" },
    { productId: id, quantity: 1, notes: "c" },
  ]);
  assert.equal(order.items.length, 3);
  const orderId = BigInt(order.id);
  const stock = async () =>
    (await db.product.findUniqueOrThrow({ where: { id: productId } }))
      .stockQuantity;

  assert.equal(await stock(), 97);
  const sales = await db.stockMovement.findMany({
    where: { orderId, type: "SALE" },
  });
  assert.equal(sales.length, 1);
  assert.equal(sales[0].quantity, -3);
  assert.ok(sales[0].orderItemId !== null, "aponta para o 1º item do produto");

  const cancel = await app.inject({
    method: "POST",
    url: `${BASE_URL}/orders/${order.id}/cancel`,
    headers,
    payload: { reason: "teste de estoque", restoreStock: true },
  });
  assert.equal(cancel.statusCode, 200, cancel.body);
  assert.equal(await stock(), 100);
  const returns = await db.stockMovement.findMany({
    where: { orderId, type: "CANCELLATION" },
  });
  assert.equal(returns.length, 1);
  assert.equal(returns[0].quantity, 3);
});

test("B11: lista operacional traz contas abertas e recentes; o histórico antigo só sob demanda", async () => {
  const open = await createOrder();
  const openIds = async (query: string) =>
    (await list(query)).map((item) => item.id);

  assert.ok((await openIds("?scope=operational")).includes(open.id));
  assert.ok((await openIds("")).includes(open.id), "contrato antigo (90 dias)");
  assert.ok((await openIds("?days=2")).includes(open.id));

  const summary = (await list("?scope=operational&view=summary")).find(
    (item) => item.id === open.id,
  ) as Record<string, any>;
  assert.ok(summary, "resumo inclui o pedido");
  assert.equal("items" in summary, false, "sem itens");
  assert.equal(summary.attendance.status, "OPEN");
  assert.equal(summary.dailyNumber, open.dailyNumber);

  // Conta fechada há 10 dias com pedido de 30 dias atrás: fora da lista operacional.
  await closeAccount(open.attendance.id);
  await db.$executeRaw`UPDATE attendances SET closed_at = NOW() - INTERVAL 10 DAY WHERE id = ${BigInt(open.attendance.id)}`;
  await db.$executeRaw`UPDATE orders SET business_date = CURDATE() - INTERVAL 30 DAY, created_at = NOW() - INTERVAL 30 DAY WHERE id = ${BigInt(open.id)}`;
  assert.ok(!(await openIds("?scope=operational")).includes(open.id));
  assert.ok(
    (await openIds("?days=90")).includes(open.id),
    "histórico sob demanda",
  );
  assert.ok(!(await openIds("?days=7")).includes(open.id));
});

test("B12: cancelados só das últimas 48 h", async () => {
  const order = await createOrder();
  const cancel = await app.inject({
    method: "PATCH",
    url: `${BASE_URL}/attendances/${order.attendance.id}/request-cancelled`,
    headers,
  });
  assert.equal(cancel.statusCode, 200, cancel.body);

  const cancelledIds = async () =>
    (
      (
        await app.inject({
          method: "GET",
          url: `${BASE_URL}/attendances/cancelled`,
          headers,
        })
      ).json() as { id: string }[]
    ).map((item) => item.id);
  assert.ok((await cancelledIds()).includes(order.attendance.id));

  await db.$executeRaw`UPDATE attendances SET updated_at = NOW() - INTERVAL 3 DAY WHERE id = ${BigInt(order.attendance.id)}`;
  assert.ok(!(await cancelledIds()).includes(order.attendance.id));
});

test("B09/B14: relatório agrupa pelo dia de operação do fechamento e rankeia por productId", async () => {
  const order = await createOrder();
  await closeAccount(order.attendance.id);
  // 04:30 em São Paulo de 11/03/2031 (07:30Z): antes da virada das 05:00 → dia de operação 10/03.
  await db.$executeRaw`UPDATE attendances SET closed_at = '2031-03-11 07:30:00' WHERE id = ${BigInt(order.attendance.id)}`;

  const response = await app.inject({
    method: "GET",
    url: `${BASE_URL}/reports/sales?start=2031-03-10&end=2031-03-11`,
    headers,
  });
  assert.equal(response.statusCode, 200, response.body);
  const [before, after] = response.json().days;
  assert.equal(before.date, "2031-03-10");
  assert.equal(before.tables, 1);
  assert.equal(before.revenue, 20, "venda sem a taxa de serviço");
  assert.equal(before.serviceFee, 2);
  assert.deepEqual(before.products, [
    {
      productId: productId.toString(),
      name: "Integration Test Product",
      quantity: 2,
    },
  ]);
  assert.equal(after.date, "2031-03-11");
  assert.equal(after.tables, 0);
  assert.equal(after.revenue, 0);
});
