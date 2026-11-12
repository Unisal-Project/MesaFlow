import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, hook, orders;
const previousFetch = globalThis.fetch;
const previousWindow = globalThis.window;
const previousStorage = globalThis.localStorage;

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  hook = await server.ssrLoadModule("/src/pages/admin/Order/hooks/useOrder.ts");
  orders = await server.ssrLoadModule("/src/services/orders.service.ts");
});
after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

const response = (overrides = {}) => ({
  id: "10",
  status: "PENDING",
  notes: null,
  customerName: null,
  createdAt: "2026-11-08T15:30:00.000Z",
  cancelledAt: null,
  cancellationReason: null,
  table: { id: "3", number: 3, name: null },
  attendance: { id: "50", status: "OPEN", closedAt: null, serviceFee: "0.00", payments: [] },
  items: [
    { id: "1", productId: "7", productName: "Burger", quantity: 1, unitPrice: "30.00", notes: "sem cebola" },
    { id: "2", productId: "7", productName: "Burger", quantity: 1, unitPrice: "30.00", notes: null },
  ],
  ...overrides,
});

test("observações por unidade: itens separados voltam a ser um item", () => {
  const [order] = hook.toOrders([response()]);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 2);
  assert.deepEqual(order.items[0].unitObservations, ["sem cebola", ""]);
  assert.equal(order.table, "Mesa 03");
  assert.equal(order.status, "open");
});

test("ida e volta preserva as observações por unidade", () => {
  const [order] = hook.toOrders([response()]);
  const input = hook.toItemsInput(order.items);
  assert.deepEqual(input, [
    { productId: "7", quantity: 1, notes: "sem cebola" },
    { productId: "7", quantity: 1 },
  ]);
});

test("unidades iguais viram uma única linha com quantidade", () => {
  const input = hook.toItemsInput([
    { productId: "7", name: "Burger", quantity: 3, unitPrice: 30, unitObservations: ["", "", ""] },
  ]);
  assert.deepEqual(input, [{ productId: "7", quantity: 3 }]);
});

test("pedidos cancelados saem da lista operacional", () => {
  const list = hook.toOrders([response(), response({ id: "11", status: "CANCELLED" })]);
  assert.deepEqual(list.map((order) => order.id), [10]);
});

test("conta fechada mostra os pagamentos só no primeiro pedido", () => {
  const attendance = {
    id: "50",
    status: "CLOSED",
    closedAt: "2026-11-08T16:00:00.000Z",
    serviceFee: "6.00",
    payments: [
      { method: "PIX", amount: "36.00", receivedAmount: null, changeAmount: null, processingFee: null },
      { method: "CASH", amount: "30.00", receivedAmount: "50.00", changeAmount: "20.00", processingFee: null },
    ],
  };
  const list = hook.toOrders([
    response({ id: "12", attendance }),
    response({ id: "10", attendance }),
  ]);
  const first = list.find((order) => order.id === 10);
  const second = list.find((order) => order.id === 12);
  assert.equal(first.status, "closed");
  assert.deepEqual(first.payment.entries.map((entry) => entry.method), ["pix", "cash"]);
  assert.equal(first.payment.entries[1].change, 20);
  assert.equal(first.payment.serviceFee, 6);
  assert.equal(first.payment.serviceFeeWaived, false);
  assert.deepEqual(second.payment.entries, []);
  assert.deepEqual(first.payment.orderIds.sort(), [10, 12]);
});

test("rotas do administrativo usam os endpoints novos", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push([options.method ?? "GET", url.replace(/^.*\/api\/v1/, ""), options.body]);
    return Response.json(response());
  };
  await orders.fetchAdminOrders(30);
  await orders.createTableOrder("3", { items: [{ productId: "7", quantity: 1 }] });
  await orders.updateOrderItems("10", { items: [{ productId: "7", quantity: 2 }], notes: null });
  await orders.cancelAdminOrder("10", { reason: "cliente desistiu", restoreStock: true });
  await orders.closeAttendance("50", {
    serviceFeeWaived: false,
    payments: [{ method: "PIX", amount: 33 }],
  });
  assert.deepEqual(
    calls.map(([method, path]) => `${method} ${path}`),
    [
      "GET /orders?days=30",
      "POST /tables/3/orders",
      "PUT /orders/10/items",
      "POST /orders/10/cancel",
      "POST /attendances/50/close",
    ],
  );
  assert.deepEqual(JSON.parse(calls[3][2]), { reason: "cliente desistiu", restoreStock: true });
});

const order = (id) => ({ id });

test("achado 5: seleção cai para o primeiro quando o pedido some da lista", () => {
  const { pickSelectedOrderId } = hook;
  assert.equal(pickSelectedOrderId(2, [order(1), order(2)]), 2);
  assert.equal(pickSelectedOrderId(9, [order(1), order(2)]), 1);
  assert.equal(pickSelectedOrderId(null, [order(3)]), 3);
  assert.equal(pickSelectedOrderId(9, []), null);
});

test("achado 6: polling a cada 15 s, sem sobrepor e parando no cleanup", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let calls = 0;
  let release;
  const load = () => {
    calls += 1;
    return new Promise((resolve) => (release = resolve));
  };
  const stop = hook.startPolling(load);
  assert.equal(hook.POLL_INTERVAL_MS, 15_000);
  assert.equal(calls, 1);
  t.mock.timers.tick(15_000);
  assert.equal(calls, 1, "não sobrepõe requisição em andamento");
  release();
  await new Promise((r) => setImmediate(r));
  t.mock.timers.tick(15_000);
  assert.equal(calls, 2);
  release();
  await new Promise((r) => setImmediate(r));
  stop();
  t.mock.timers.tick(60_000);
  assert.equal(calls, 2, "cleanup interrompe o polling");
});
