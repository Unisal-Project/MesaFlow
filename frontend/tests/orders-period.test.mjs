import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server, utils, hook, runHook, Orders;
const previous = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch, timezone: process.env.TZ };
before(async () => {
  process.env.TZ = "America/Sao_Paulo";
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true },
    plugins: [{ name: "order-period-hooks", enforce: "pre", transform(code, id) {
      if (id.endsWith("/Order/hooks/useOrder.ts")) return code.replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"');
    } }],
  });
  utils = await server.ssrLoadModule("/src/pages/admin/Order/utils/order.utils.ts");
  hook = await server.ssrLoadModule("/src/pages/admin/Order/hooks/useOrder.ts");
  ({ createHookRunner: runHook } = await server.ssrLoadModule("/tests/helpers/hook-runtime.mjs"));
  ({ default: Orders } = await server.ssrLoadModule("/src/pages/admin/Order/index.tsx"));
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, { window: previous.window, localStorage: previous.localStorage, fetch: previous.fetch });
  if (previous.timezone === undefined) delete process.env.TZ; else process.env.TZ = previous.timezone;
});
const response = (id, createdAt, status = "OPEN", extra = {}) => ({
  id: String(id), status: "PENDING", createdAt, notes: null,
  table: { id: String(id), number: id, name: null },
  attendance: { id: String(id), status, closedAt: status === "CLOSED" ? createdAt : null, payments: [], serviceFee: "0" },
  items: [], ...extra,
});
const ids = list => list.map(order => order.id);
const freeze = (t, value = "2026-11-16T12:00:00-03:00") => t.mock.timers.enable({ apis: ["Date"], now: new Date(value) });

test("Hoje inclui dia local e atendimento antigo ainda aberto; cancelados ficam fora", () => {
  const orders = hook.toOrders([
    response(1, "2026-11-16T01:00:00-03:00"),
    response(2, "2026-11-15T23:00:00-03:00"),
    response(3, "2026-11-15T22:00:00-03:00", "CLOSED"),
    response(4, "2026-11-15T21:00:00-03:00", "CANCELLED"),
    response(5, "2026-11-15T20:00:00-03:00", "OPEN", { status: "CANCELLED" }),
    response(6, "2026-11-15T19:00:00-03:00", "AWAITING_PAYMENT"),
  ]);
  assert.deepEqual(ids(utils.filterOrdersByDate(orders, "today", "", "2026-11-16")), [1, 2, 6]);
});

test("Ontem, 7/30 dias e Data usam calendário local e limites inclusivos", () => {
  const dates = ["2026-11-16", "2026-11-15", "2026-11-10", "2026-11-09", "2026-10-18", "2026-10-17", "2026-11-17"];
  const orders = dates.map((date, id) => ({ id, date, status: "closed", table: "Mesa" }));
  const filter = (period, date = "") => ids(utils.filterOrdersByDate(orders, period, date, "2026-11-16"));
  assert.deepEqual(filter("yesterday"), [1]);
  assert.deepEqual(filter("7days"), [0, 1, 2]);
  assert.deepEqual(filter("30days"), [0, 1, 2, 3, 4]);
  assert.deepEqual(filter("specific", "2026-10-17"), [5]);
  assert.deepEqual(filter("all"), ids(orders));
  // Semana que atravessa o antigo início do horário de verão brasileiro.
  assert.equal(utils.filterOrdersByDate([{ id: 1, date: "2018-11-02", status: "closed" }], "7days", "", "2018-11-08").length, 1);
});

test("período Hoje padrão combina busca/status; contagem de hoje não inclui antigos abertos", async t => {
  freeze(t);
  globalThis.fetch = async () => Response.json([
    response(1, "2026-11-16T10:00:00-03:00"),
    response(2, "2026-11-15T23:00:00-03:00"),
    response(3, "2026-11-15T22:00:00-03:00", "CLOSED"),
  ]);
  const run = runHook(() => hook.useOrder());
  await run().reload();
  assert.equal(run().period, "today");
  assert.deepEqual(ids(run().filteredOrders), [1, 2]);
  assert.deepEqual(ids(run().todayOrders), [1]);
  run().setSearchQuery("Mesa 02");
  assert.deepEqual(ids(run().filteredOrders), [2]);
  run().setActiveFilter("closed");
  assert.deepEqual(ids(run().filteredOrders), []);
  run().setSearchQuery("");
  run().setPeriod("yesterday");
  assert.deepEqual(ids(run().filteredOrders), [3]);
  run().setActiveFilter("all");
  assert.deepEqual(ids(run().filteredOrders), [2, 3]);
  assert.ok(run().filteredOrders.some(o => o.id === run().selectedOrderId));
  run().openOrder(3);
  assert.equal(run().selectedOrder.id, 3, "link direto de pedido histórico continua acessível");
  assert.equal(run().period, "specific");
  run().openOrder();
  assert.equal(run().period, "today");
});

test("virada 23:59→00:00 usa dia local, recalcula Hoje no render e mantém o aberto", async t => {
  freeze(t, "2026-11-16T02:59:00Z"); // 15/11 23:59 em São Paulo
  globalThis.fetch = async () => Response.json([
    response(1, "2026-11-16T02:59:00Z", "CLOSED"),
    response(2, "2026-11-16T02:59:00Z"),
    response(3, "2026-11-16T03:00:00Z", "CLOSED"),
  ]);
  const run = runHook(() => hook.useOrder());
  await run().reload();
  assert.equal(run().todayDate, "2026-11-15");
  assert.equal(hook.toOrders([response(1, "2026-11-16T02:59:00Z")])[0].date, "2026-11-15");
  assert.deepEqual(ids(run().filteredOrders).sort(), [1, 2]);
  t.mock.timers.setTime(new Date("2026-11-16T03:00:00Z").getTime());
  assert.equal(run().todayDate, "2026-11-16");
  assert.deepEqual(ids(run().filteredOrders), [3, 2]);
  assert.deepEqual(ids(run().todayOrders), [3]);
});

test("tela usa Tabs e input date limitado à janela, com vazio por período e Status", async t => {
  freeze(t);
  globalThis.fetch = async () => Response.json([]);
  const run = runHook(() => hook.useOrder());
  await run().reload();
  const html = () => renderToStaticMarkup(createElement(Orders, { state: run() }));
  assert.match(html(), /Nenhum pedido hoje\./);
  for (const label of ["Hoje", "Ontem", "7 dias", "30 dias", "Data"]) assert.ok(html().includes(label));
  assert.match(html(), /Filtrar por status/);
  run().setPeriod("yesterday");
  assert.match(html(), /Nenhum pedido ontem\./);
  run().setPeriod("specific");
  assert.match(html(), /type="date"[^>]*min="2026-08-19"[^>]*max="2026-11-16"/);
  run().setSpecificDate("2026-08-18");
  assert.notEqual(run().specificDate, "2026-08-18");
  run().setSpecificDate("2026-11-17");
  assert.notEqual(run().specificDate, "2026-11-17");
  run().setSpecificDate("2026-11-14");
  assert.equal(run().specificDate, "2026-11-14");
});

test("link direto histórico antes do carregamento abre data e detalhes após reload", async t => {
  freeze(t);
  globalThis.fetch = async () => Response.json([response(3, "2026-11-15T22:00:00-03:00", "CLOSED")]);
  const run = runHook(() => hook.useOrder());
  run().openOrder(3); // A rota chama antes de a API responder.
  await run().reload();
  assert.equal(run().period, "specific");
  assert.equal(run().specificDate, "2026-11-15");
  assert.deepEqual(ids(run().filteredOrders), [3]);
  assert.equal(run().selectedOrder.id, 3);
});

test("pedido QR9 exato aparece Hoje após sair do foco de outro pedido", async t => {
 freeze(t,"2026-11-16T02:10:00Z");
 let records=[response(8,"2026-11-16T02:00:00Z")];
 globalThis.fetch=async()=>Response.json(records);
 const run=runHook(()=>hook.useOrder()); await run().reload(); run().openOrder(8);
 records=[...records,response(9,"2026-11-16T02:06:33Z")]; await run().reload();
 assert.ok(run().filteredOrders.some(order=>order.id===9));
 run().setPeriod("today"); assert.ok(run().filteredOrders.some(order=>order.id===9));
});

test("clicar em outro pedido depois de um link/notificação mantém o período escolhido", async t => {
  freeze(t, "2026-11-16T02:10:00Z");
  globalThis.fetch = async () => Response.json([response(8, "2026-11-16T02:00:00Z"), response(5, "2026-11-13T15:00:00-03:00", "CLOSED")]);
  const run = runHook(() => hook.useOrder());
  await run().reload();
  run().openOrder(8); // veio de link/notificação
  run().setPeriod("7days");
  run().selectOrder(5); // usuário escolhe outro pedido da lista
  assert.equal(run().period, "7days");
  assert.equal(run().selectedOrder.id, 5);
});

test("excluir pedido: motivo digitado vai ao backend; vazio ou curto usa o padrão", async t => {
  freeze(t, "2026-11-16T02:10:00Z");
  const bodies = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes("/cancel")) { bodies.push(JSON.parse(options.body)); return Response.json({}); }
    return Response.json([response(8, "2026-11-16T02:00:00Z")]);
  };
  const run = runHook(() => hook.useOrder());
  await run().reload();
  for (const typed of ["Cliente desistiu", "", "ok"]) {
    run().selectOrder(8);
    await run().cancelOrder(true, typed);
  }
  assert.deepEqual(bodies.map(body => body.reason), ["Cliente desistiu", "Excluído pelo administrador", "Excluído pelo administrador"]);
  assert.ok(bodies.every(body => body.restoreStock === true));
});
