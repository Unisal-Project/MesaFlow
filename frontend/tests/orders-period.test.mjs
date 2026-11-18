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

test("virada 04:59→05:00 muda o dia de operação, recalcula Hoje no render e mantém o aberto", async t => {
  freeze(t, "2026-11-16T07:59:00Z"); // 16/11 04:59 em São Paulo: ainda é o dia de operação 15
  const day15 = { businessDate: "2026-11-15" };
  globalThis.fetch = async () => Response.json([
    response(1, "2026-11-16T02:59:00Z", "CLOSED", day15),
    response(2, "2026-11-16T02:59:00Z", "OPEN", day15),
    response(3, "2026-11-16T08:00:00Z", "CLOSED", { businessDate: "2026-11-16" }),
  ]);
  const run = runHook(() => hook.useOrder());
  await run().reload();
  assert.equal(run().todayDate, "2026-11-15");
  assert.equal(hook.toOrders([response(1, "2026-11-16T02:59:00Z", "OPEN", day15)])[0].date, "2026-11-15");
  assert.deepEqual(ids(run().filteredOrders).sort(), [1, 2]);
  t.mock.timers.setTime(new Date("2026-11-16T08:00:00Z").getTime()); // 05:00: virou
  assert.equal(run().todayDate, "2026-11-16");
  assert.deepEqual(ids(run().filteredOrders), [3, 2]);
  assert.deepEqual(ids(run().todayOrders), [3]);
});

test("B09: a virada vem de /settings e o pedido sem businessDate cai no dia local", async t => {
  const businessDay = await server.ssrLoadModule("/src/utils/businessDay.ts");
  freeze(t, "2026-11-16T05:30:00Z"); // 02:30 em São Paulo
  try {
    assert.equal(businessDay.businessToday(), "2026-11-15"); // virada 05:00: ainda ontem
    businessDay.setDayCutoff(0);
    assert.equal(businessDay.businessToday(), "2026-11-16"); // virada à meia-noite
    businessDay.setDayCutoff(undefined); // valor inválido volta ao padrão
    assert.equal(businessDay.getDayCutoff(), 5);
    businessDay.setDayCutoff(2);
    assert.equal(businessDay.businessToday(), "2026-11-16"); // 02:30 já passou da virada das 02:00
  } finally { businessDay.setDayCutoff(5); }
});

test("B11: o polling baixa só a janela do período escolhido (Hoje/Ontem = operacional)", async t => {
  freeze(t);
  const urls = [];
  globalThis.fetch = async url => { urls.push(String(url).replace(/^.*\/api\/v1/, "")); return Response.json([]); };
  const run = runHook(() => hook.useOrder());
  await run().reload();
  run().setPeriod("yesterday"); await run().reload();
  run().setPeriod("7days"); await run().reload();
  run().setPeriod("30days"); await run().reload();
  run().setPeriod("all"); await run().reload();
  run().setPeriod("specific"); run().setSpecificDate("2026-11-14"); await run().reload();
  assert.deepEqual(urls, [
    "/orders?scope=operational", "/orders?scope=operational",
    "/orders?days=8", "/orders?days=31", "/orders?days=90", "/orders?days=4",
  ]);
  assert.equal(hook.historyDays("today", "", "2026-11-16"), null);
  assert.equal(hook.historyDays("specific", "2026-08-19", "2026-11-16"), 91); // limite da janela de 90 dias
});

test("B11: link para pedido antigo fora da janela operacional busca 90 dias uma vez", async t => {
  freeze(t);
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(String(url).replace(/^.*\/api\/v1/, ""));
    return Response.json(String(url).includes("days=90") ? [response(3, "2026-10-20T12:00:00-03:00", "CLOSED")] : []);
  };
  const run = runHook(() => hook.useOrder());
  run().openOrder(3);
  await run().reload();
  await run().reload();
  assert.deepEqual(urls, ["/orders?scope=operational", "/orders?days=90"]);
  assert.equal(run().selectedOrder.id, 3);
});

test("B11: link para pedido antigo não 'some' enquanto a busca ampliada não termina", async t => {
  freeze(t);
  globalThis.fetch = async url => Response.json(
    String(url).includes("days=90") ? [response(45, "2026-11-13T12:00:00-03:00", "CLOSED")] : [],
  );
  const run = runHook(() => hook.useOrder());
  run().openOrder(45); // F5 em /admin/pedidos/45
  await run().reload(); // lista operacional: o pedido não está nela
  assert.equal(run().orders.some(order => order.id === 45), false);
  assert.equal(run().resolvingOrder, true, "a rota não pode redirecionar ainda");
  await run().reload(); // busca ampliada (90 dias)
  assert.equal(run().resolvingOrder, false);
  assert.equal(run().orders.some(order => order.id === 45), true);
});

test("B11: pedido que não existe em 90 dias libera o redirecionamento só depois da busca", async t => {
  freeze(t);
  globalThis.fetch = async () => Response.json([]);
  const run = runHook(() => hook.useOrder());
  run().openOrder(999);
  await run().reload();
  assert.equal(run().resolvingOrder, true);
  await run().reload();
  assert.equal(run().resolvingOrder, false, "buscou 90 dias e não achou: pode redirecionar");
});

test("A: ordena pelo instante de criação; turno que passa da meia-noite não inverte (23:59 × 00:47)", () => {
  const order = (id, createdAt, time) => ({ id, date: "2026-11-16", time, createdAt, status: "open", table: "Mesa" });
  const list = [
    order(1, "2026-11-17T02:59:00Z", "23:59"), // 23:59 de 16/11 em São Paulo
    order(2, "2026-11-17T03:47:00Z", "00:47"), // 00:47 de 17/11: mesmo dia de operação 16/11
    order(3, "2026-11-17T05:30:00Z", "02:30"),
  ];
  assert.deepEqual(ids(utils.sortOrders(list, "newest")), [3, 2, 1]);
  assert.deepEqual(ids(utils.sortOrders(list, "oldest")), [1, 2, 3]);
  // Mesmo instante: desempata por id. Sem createdAt (dados antigos): dia + hora.
  const same = [order(5, "2026-11-17T03:00:00Z", "00:00"), order(4, "2026-11-17T03:00:00Z", "00:00")];
  assert.deepEqual(ids(utils.sortOrders(same, "oldest")), [4, 5]);
  const legacy = [{ id: 1, date: "2026-11-16", time: "10:00", status: "open", table: "M" }, { id: 2, date: "2026-11-16", time: "11:00", status: "open", table: "M" }];
  assert.deepEqual(ids(utils.sortOrders(legacy, "newest")), [2, 1]);
  // toOrder guarda o instante vindo da API.
  assert.equal(hook.toOrders([response(1, "2026-11-17T02:59:00Z")])[0].createdAt, "2026-11-17T02:59:00Z");
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
