import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/admin_orders_test";
process.env.JWT_SECRET ??= "admin-orders-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

const { PrismaAdminOrderRepository } =
  await import("../src/modules/orders/repositories/prisma-admin-order.repository.js");
const { PrismaPaymentRepository } =
  await import("../src/modules/payments/repositories/prisma-payment.repository.js");
const { AppError } = await import("../src/shared/errors/app-errors.js");

type Product = {
  id: bigint;
  name: string;
  price: string;
  stockQuantity: number;
  active: boolean;
  available: boolean;
};

/** Banco em memória com só o que os repositórios usam. */
function fakeDb() {
  const products: Product[] = [
    {
      id: 1n,
      name: "Burger",
      price: "30.00",
      stockQuantity: 5,
      active: true,
      available: true,
    },
    {
      id: 2n,
      name: "Suco",
      price: "10.00",
      stockQuantity: 2,
      active: true,
      available: true,
    },
  ];
  const attendances: any[] = [];
  const orders: any[] = [];
  const items: any[] = [];
  const movements: any[] = [];
  const payments: any[] = [];
  let seq = 100n;
  const next = () => ++seq;

  const fullOrder = (id: bigint) => {
    const order = orders.find((o) => o.id === id);
    const attendance = attendances.find((a) => a.id === order.attendanceId);
    return {
      ...order,
      items: items
        .filter((i) => i.orderId === id)
        .map((i) => ({
          ...i,
          product: { name: products.find((p) => p.id === i.productId)!.name },
        })),
      attendance: {
        ...attendance,
        table: { id: 7n, number: 7, name: "Mesa 07" },
        payments: payments.filter((p) => p.attendanceId === attendance.id),
      },
    };
  };

  const client: any = {
    $transaction: async (callback: (tx: any) => unknown) => callback(client),
    $queryRaw: async () => undefined,
    restaurantTable: {
      findUnique: async () => ({ active: true }),
    },
    attendance: {
      findFirst: async ({ where }: any) =>
        attendances.find(
          (a) =>
            a.tableId === where.tableId && where.status.in.includes(a.status),
        ) ?? null,
      findUnique: async ({ where }: any) =>
        attendances.find((a) => a.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const row = { id: next(), serviceFee: "0.00", closedAt: null, ...data };
        attendances.push(row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = attendances.find(
          (a) => a.id === where.id && a.status === where.status,
        );
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      },
    },
    attendanceTotal: {
      findUnique: async ({ where }: any) => {
        const total = orders
          .filter(
            (o) =>
              o.attendanceId === where.attendanceId && o.status !== "CANCELLED",
          )
          .flatMap((o) => items.filter((i) => i.orderId === o.id))
          .reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
        return { total: total.toFixed(2) };
      },
    },
    product: {
      findMany: async ({ where }: any) =>
        products.filter((p) => where.id.in.includes(p.id)),
      findUnique: async ({ where }: any) =>
        products.find((p) => p.id === where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        const row = products.find((p) => p.id === where.id);
        const min = where.stockQuantity?.gte;
        if (!row || (min !== undefined && row.stockQuantity < min))
          return { count: 0 };
        row.stockQuantity += data.stockQuantity.increment;
        return { count: 1 };
      },
    },
    order: {
      create: async ({ data }: any) => {
        const order = {
          id: next(),
          status: "PENDING",
          createdAt: new Date(),
          cancelledAt: null,
          cancellationReason: null,
          customerName: null,
          attendanceId: data.attendanceId,
          notes: data.notes,
        };
        orders.push(order);
        for (const item of data.items.create)
          items.push({ id: next(), orderId: order.id, ...item });
        return { ...order, items: items.filter((i) => i.orderId === order.id) };
      },
      findUnique: async ({ where }: any) => {
        const order = orders.find((o) => o.id === where.id);
        if (!order) return null;
        return {
          ...order,
          items: items.filter((i) => i.orderId === order.id),
          attendance: attendances.find((a) => a.id === order.attendanceId),
        };
      },
      findUniqueOrThrow: async ({ where }: any) => fullOrder(where.id),
      update: async ({ where, data }: any) => {
        const order = orders.find((o) => o.id === where.id);
        const { items: nested, ...rest } = data;
        Object.assign(order, rest);
        for (const item of nested?.create ?? [])
          items.push({ id: next(), orderId: order.id, ...item });
        return order;
      },
    },
    orderItem: {
      deleteMany: async ({ where }: any) => {
        for (let i = items.length - 1; i >= 0; i--)
          if (items[i].orderId === where.orderId) items.splice(i, 1);
      },
    },
    stockMovement: {
      create: async ({ data }: any) => movements.push(data),
      updateMany: async () => ({ count: 0 }),
    },
    printJob: { create: async () => ({}) },
    payment: {
      create: async ({ data }: any) => payments.push(data),
    },
  };
  return { client, products, attendances, movements, payments };
}

const admin = { id: 1n, role: "ADMIN" as const };
const stock = (db: ReturnType<typeof fakeDb>, id: bigint) =>
  db.products.find((p) => p.id === id)!.stockQuantity;

test("criar pedido abre atendimento, debita estoque e registra SALE", async () => {
  const db = fakeDb();
  const repo = new PrismaAdminOrderRepository(db.client);
  const order = await repo.createForTable(
    7n,
    [{ productId: 1n, quantity: 2, notes: "sem cebola" }],
    null,
    admin,
  );
  assert.equal(db.attendances.length, 1);
  assert.equal(db.attendances[0].status, "OPEN");
  assert.equal(stock(db, 1n), 3);
  assert.deepEqual(
    db.movements.map((m) => [m.type, m.quantity]),
    [["SALE", -2]],
  );
  assert.equal(order.items[0].unitPrice, "30.00");

  // Segundo pedido na mesma mesa reutiliza o atendimento aberto.
  await repo.createForTable(7n, [{ productId: 2n, quantity: 1 }], null, admin);
  assert.equal(db.attendances.length, 1);
});

test("estoque insuficiente recusa o pedido sem debitar", async () => {
  const db = fakeDb();
  const repo = new PrismaAdminOrderRepository(db.client);
  await assert.rejects(
    repo.createForTable(7n, [{ productId: 2n, quantity: 3 }], null, admin),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      /Estoque insuficiente para Suco/.test(error.message),
  );
  assert.equal(stock(db, 2n), 2);
});

test("produto indisponível não entra no pedido", async () => {
  const db = fakeDb();
  db.products[0].available = false;
  const repo = new PrismaAdminOrderRepository(db.client);
  await assert.rejects(
    repo.createForTable(7n, [{ productId: 1n, quantity: 1 }], null, admin),
    /não está disponível/,
  );
});

test("editar itens movimenta só a diferença e mantém o preço vendido", async () => {
  const db = fakeDb();
  const repo = new PrismaAdminOrderRepository(db.client);
  const order = await repo.createForTable(
    7n,
    [{ productId: 1n, quantity: 2 }],
    null,
    admin,
  );
  db.products[0].price = "99.00";
  const edited = await repo.replaceItems(
    order.id,
    [
      { productId: 1n, quantity: 3 },
      { productId: 2n, quantity: 1 },
    ],
    "tudo junto",
    admin,
  );
  assert.equal(stock(db, 1n), 2); // 5 - 2 - 1
  assert.equal(stock(db, 2n), 1);
  assert.deepEqual(
    db.movements.slice(1).map((m) => [m.type, m.productId, m.quantity]),
    [
      ["ADJUSTMENT", 1n, -1],
      ["ADJUSTMENT", 2n, -1],
    ],
  );
  assert.equal(
    edited.items.find((i: any) => i.productId === 1n)!.unitPrice,
    "30.00",
  );
  assert.equal(edited.notes, "tudo junto");

  await repo.replaceItems(
    order.id,
    [{ productId: 2n, quantity: 1 }],
    undefined,
    admin,
  );
  assert.equal(stock(db, 1n), 5); // devolve as 3 unidades
});

test("cancelar repõe estoque uma única vez", async () => {
  const db = fakeDb();
  const repo = new PrismaAdminOrderRepository(db.client);
  const order = await repo.createForTable(
    7n,
    [{ productId: 1n, quantity: 2 }],
    null,
    admin,
  );
  const cancelled = await repo.cancel(
    order.id,
    "cliente desistiu",
    true,
    admin,
  );
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.cancellationSource, "ADMIN");
  assert.equal(stock(db, 1n), 5);
  await assert.rejects(
    repo.cancel(order.id, "de novo", true, admin),
    /já foi cancelado/,
  );
  assert.equal(stock(db, 1n), 5);
});

test("cancelar sem repor estoque não movimenta o produto", async () => {
  const db = fakeDb();
  const repo = new PrismaAdminOrderRepository(db.client);
  const order = await repo.createForTable(
    7n,
    [{ productId: 1n, quantity: 2 }],
    null,
    admin,
  );
  await repo.cancel(order.id, "prato já preparado", false, admin);
  assert.equal(stock(db, 1n), 3);
});

test("fechar conta exige pagamentos somando subtotal + 10%", async () => {
  const db = fakeDb();
  const orders = new PrismaAdminOrderRepository(db.client);
  const order = await orders.createForTable(
    7n,
    [{ productId: 1n, quantity: 2 }],
    null,
    admin,
  );
  const payments = new PrismaPaymentRepository(db.client);
  const attendanceId = order.attendanceId;

  await assert.rejects(
    payments.closeWithPayments(
      attendanceId,
      { serviceFeeWaived: false, payments: [{ method: "PIX", amount: 60 }] },
      1n,
    ),
    /somam R\$ 60.00, mas a conta é R\$ 66.00/,
  );

  const result = await payments.closeWithPayments(
    attendanceId,
    {
      serviceFeeWaived: false,
      payments: [
        { method: "PIX", amount: 36 },
        { method: "CASH", amount: 30, receivedAmount: 50 },
      ],
    },
    1n,
  );
  assert.equal(result.total, "66.00");
  assert.equal(result.serviceFee, "6.00");
  assert.equal(db.attendances[0].status, "CLOSED");
  assert.equal(db.attendances[0].serviceFee, "6.00");
  assert.equal(db.payments[1].changeAmount, "20.00");

  // Conta fechada não recebe novos pedidos nem edições.
  await assert.rejects(
    orders.replaceItems(
      order.id,
      [{ productId: 1n, quantity: 1 }],
      undefined,
      admin,
    ),
    /já foi fechada/,
  );
});

test("isenção da taxa cobra só o subtotal", async () => {
  const db = fakeDb();
  const orders = new PrismaAdminOrderRepository(db.client);
  const order = await orders.createForTable(
    7n,
    [{ productId: 2n, quantity: 1 }],
    null,
    admin,
  );
  const result = await new PrismaPaymentRepository(db.client).closeWithPayments(
    order.attendanceId,
    {
      serviceFeeWaived: true,
      payments: [{ method: "DEBIT_CARD", amount: 10 }],
    },
    1n,
  );
  assert.equal(result.total, "10.00");
  assert.equal(result.serviceFee, "0.00");
});

test("estoque é atualizado em ordem crescente de productId (evita deadlock)", async () => {
  const db = fakeDb();
  const repo = new PrismaAdminOrderRepository(db.client);
  const order = await repo.createForTable(
    7n,
    [
      { productId: 2n, quantity: 1 },
      { productId: 1n, quantity: 1 },
    ],
    null,
    admin,
  );
  await repo.replaceItems(
    order.id,
    [
      { productId: 2n, quantity: 2 },
      { productId: 1n, quantity: 2 },
    ],
    undefined,
    admin,
  );
  await repo.cancel(order.id, "teste", true, admin);
  assert.deepEqual(
    db.movements.map((m) => [m.type, m.productId]),
    [
      ["SALE", 1n],
      ["SALE", 2n],
      ["ADJUSTMENT", 1n],
      ["ADJUSTMENT", 2n],
      ["CANCELLATION", 1n],
      ["CANCELLATION", 2n],
    ],
  );
});
