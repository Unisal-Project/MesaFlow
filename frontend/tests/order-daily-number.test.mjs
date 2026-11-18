import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, utils, hook;
const previous = { window: globalThis.window, localStorage: globalThis.localStorage };

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  utils = await server.ssrLoadModule("/src/pages/admin/Order/utils/order.utils.ts");
  hook = await server.ssrLoadModule("/src/pages/admin/Order/hooks/useOrder.ts");
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

const response = (overrides = {}) => ({
  id: "120",
  dailyNumber: 27,
  businessDate: "2026-11-17",
  status: "PENDING",
  notes: null,
  customerName: null,
  createdAt: "2026-11-17T15:30:00.000Z",
  cancelledAt: null,
  cancellationReason: null,
  table: { id: "3", number: 3, name: null },
  attendance: { id: "50", status: "OPEN", closedAt: null, serviceFee: "0.00", payments: [] },
  items: [{ id: "1", productId: "7", productName: "Burger", quantity: 1, unitPrice: "30.00", notes: null }],
  ...overrides,
});

test("exibe o número do dia e cai para o id quando ele não vem", () => {
  const [order] = hook.toOrders([response()]);
  assert.equal(order.id, 120, "id continua sendo o identificador");
  assert.equal(order.dailyNumber, 27);
  assert.equal(utils.orderNumber(order), "#27");
  const [legacy] = hook.toOrders([response({ dailyNumber: undefined, businessDate: undefined })]);
  assert.equal(utils.orderNumber(legacy), "#120");
});

test("data aparece só quando o pedido não é do dia de operação atual", () => {
  const [order] = hook.toOrders([response()]);
  assert.equal(utils.orderNumber(order, "2026-11-17"), "#27", "pedido de hoje: sem data");
  // Pedido aberto de ontem aparece em "Hoje", mas com a data.
  assert.equal(utils.orderNumber(order, "2026-11-18"), "#27 · 17/11");
  // Sem businessDate usa a data local do pedido.
  assert.equal(utils.orderNumber({ id: 9, date: "2026-11-02" }, "2026-11-17"), "#9 · 02/11");
  // Sem dia atual (mensagens, diálogo): só o número.
  assert.equal(utils.orderNumber(order), "#27");
});

test("dia de operação atual: usa a virada configurada (padrão 05:00) no fuso de São Paulo", async () => {
  const businessDay = await server.ssrLoadModule("/src/utils/businessDay.ts");
  // 04:59 em São Paulo (07:59Z) ainda é o dia anterior; 05:00 já é o dia.
  assert.equal(utils.currentBusinessDate(new Date("2026-11-18T07:59:00Z")), "2026-11-17");
  assert.equal(utils.currentBusinessDate(new Date("2026-11-18T08:00:00Z")), "2026-11-18");
  // Servidor/navegador em UTC não importa: 01:00Z do dia 18 é 22:00 do dia 17.
  assert.equal(utils.currentBusinessDate(new Date("2026-11-18T01:00:00Z")), "2026-11-17");
  // Virada configurada em Configurações (sem o 5 fixo): 03:30 local com virada 03:00 já é o dia 18.
  businessDay.setDayCutoff(3);
  try {
    assert.equal(utils.currentBusinessDate(new Date("2026-11-18T06:30:00Z")), "2026-11-18");
    assert.equal(utils.currentBusinessDate(new Date("2026-11-18T05:59:00Z")), "2026-11-17");
  } finally { businessDay.setDayCutoff(5); }
  assert.equal(businessDay.addDays("2026-12-31", 1), "2027-01-01");
});


test("busca encontra pelo número do dia e pelo id", () => {
  const orders = hook.toOrders([response(), response({ id: "121", dailyNumber: 28 })]);
  assert.deepEqual(utils.filterOrders(orders, "all", "#27").map((o) => o.id), [120]);
  assert.deepEqual(utils.filterOrders(orders, "all", "121").map((o) => o.id), [121]);
  assert.deepEqual(utils.filterOrders(orders, "all", "28").map((o) => o.id), [121]);
});
