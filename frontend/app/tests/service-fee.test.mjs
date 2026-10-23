import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, calculateBill, getAccountOrders;
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  ({ calculateBill } = await server.ssrLoadModule("/src/utils/serviceFee.ts"));
  ({ getAccountOrders } = await server.ssrLoadModule("/src/pages/admin/Order/utils/order.utils.ts"));
});
after(async () => { await server?.close(); });

test("calcula 10% sobre o consumo agregado com arredondamento em centavos", () => {
  assert.deepEqual(calculateBill(1005 + 1005), {
    subtotalInCents: 2010, serviceInCents: 201, totalInCents: 2211,
  });
  assert.equal(calculateBill(1005).serviceInCents, 101);
  assert.equal(calculateBill(0).totalInCents, 0);
});
test("retira a taxa sem alterar o consumo", () => {
  assert.deepEqual(calculateBill(2010, true), {
    subtotalInCents: 2010, serviceInCents: 0, totalInCents: 2010,
  });
});
test("fecha apenas os pedidos abertos do mesmo atendimento", () => {
  const orders = [
    { id: 1, attendanceId: "a", status: "delivered" },
    { id: 2, attendanceId: "a", status: "ready" },
    { id: 3, attendanceId: "b", status: "delivered" },
    { id: 4, attendanceId: "a", status: "closed" },
  ];
  assert.deepEqual(getAccountOrders(orders, orders[0]).map(o => o.id), [1, 2]);
  const unlinked = { id: 5, status: "delivered" };
  assert.deepEqual(getAccountOrders([...orders, unlinked], unlinked), [unlinked]);
});
