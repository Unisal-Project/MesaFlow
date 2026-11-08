import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

let server, hook, Dashboard;
const previousWindow = globalThis.window;
const previousStorage = globalThis.localStorage;

const dayKey = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  hook = await server.ssrLoadModule("/src/pages/admin/Dashboard/hooks/useDashboard.ts");
  Dashboard = (await server.ssrLoadModule("/src/pages/admin/Dashboard/index.tsx")).default;
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

const item = { productId: "7", name: "Burger", quantity: 2, unitPrice: 30 };
const closed = (id, closedOn, amounts) => ({
  id,
  table: "Mesa 01",
  tableId: "1",
  attendanceId: `a${id}`,
  status: "closed",
  date: closedOn,
  time: "12:00",
  items: [item],
  payment: {
    entries: amounts.map((amount) => ({ method: "pix", amount })),
    closedAt: "12:30",
    closedOn,
    orderIds: [id],
  },
});
const open = (id) => ({
  id,
  table: "Mesa 02",
  tableId: "2",
  attendanceId: "b",
  status: "open",
  date: dayKey(),
  time: "13:00",
  items: [item],
});
const table = (id, status, active = true) => ({
  id,
  number: Number(id),
  name: `Mesa ${id.padStart(2, "0")}`,
  status,
  active,
  seats: 4,
  attendanceId: null,
  menuUrl: "",
});

test("vendas do dia somam pagamentos de contas fechadas naquele dia", () => {
  const orders = [
    closed(1, dayKey(), [36, 30]),
    closed(2, dayKey(), [44]),
    closed(3, dayKey(1), [100]),
    // Pedido extra da mesma conta: sem pagamentos, não conta de novo.
    { ...closed(4, dayKey(), []), payment: { ...closed(4, dayKey(), []).payment, entries: [] } },
    open(5),
  ];
  assert.deepEqual(hook.salesOn(orders, dayKey()), { total: 110, accounts: 2 });
  assert.deepEqual(hook.salesOn(orders, dayKey(1)), { total: 100, accounts: 1 });
});

test("dashboard mostra indicadores, fila e mesas reais", () => {
  const html = renderToString(
    createElement(Dashboard, {
      orders: [closed(1, dayKey(), [60]), closed(3, dayKey(1), [40]), open(9), open(8)],
      tables: [table("1", "available"), table("2", "occupied"), table("3", "awaiting_payment"), table("4", "available", false)],
    }),
  );
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Vendas hoje R\$\s?60,00 \+50% vs\. ontem/);
  assert.match(text, /Pedidos ativos 2/);
  assert.match(text, /Mesas ocupadas 2\/3 67% do salão agora/); // a inativa fica fora
  assert.match(text, /Ticket médio R\$\s?60,00 1 conta fechada hoje/);
  assert.match(text, /Pedido # ?9.*Pedido # ?8/); // mais recente primeiro
  assert.match(text, /Mesa 02 · 2x Burger/);
  assert.ok(!text.includes("Mesa 04"));
});

test("dashboard vazio não quebra e explica o estado", () => {
  const html = renderToString(createElement(Dashboard, { orders: [], tables: [] }));
  assert.match(html, /Nenhum pedido em aberto agora/);
  assert.match(html, /Nenhuma mesa cadastrada/);
  assert.match(html, /Sem vendas ontem/);
});
