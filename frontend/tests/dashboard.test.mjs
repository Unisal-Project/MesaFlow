import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

let server, hook, Dashboard, greetingPeriod, dashboardGreeting, businessDay;
const previousWindow = globalThis.window;
const previousStorage = globalThis.localStorage;

// Dia de operação (fuso do restaurante + virada), o mesmo que o Dashboard usa como "hoje".
const dayKey = (offset = 0) => businessDay.businessDaysAgo(offset);

before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  businessDay = await server.ssrLoadModule("/src/utils/businessDay.ts");
  hook = await server.ssrLoadModule("/src/pages/admin/Dashboard/hooks/useDashboard.ts");
  ({ greetingPeriod, dashboardGreeting } = await server.ssrLoadModule("/src/pages/admin/Dashboard/utils/dashboard.utils.ts"));
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
  // 3 pedidos concluídos hoje (o 4º é da mesma conta que já pagou, sem pagamentos novos).
  assert.deepEqual(hook.salesOn(orders, dayKey()), { total: 110, accounts: 2, orders: 3, serviceFee: 0 });
  assert.deepEqual(hook.salesOn(orders, dayKey(1)), { total: 100, accounts: 1, orders: 1, serviceFee: 0 });
});

test("B10: venda e ticket médio são SEM a taxa de serviço (igual a Relatórios)", () => {
  // Conta de R$ 100,00 + 10% de taxa: pagou 110, a venda é 100 e a taxa fica à parte.
  const withFee = closed(1, dayKey(), [60, 50]);
  withFee.payment.serviceFee = 10;
  const second = closed(2, dayKey(), [66]);
  second.payment.serviceFee = 6;
  assert.deepEqual(hook.salesOn([withFee, second], dayKey()), { total: 160, accounts: 2, orders: 2, serviceFee: 16 });
  const html = renderToString(createElement(Dashboard, { orders: [withFee, second], tables: [] }));
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Vendas hoje R\$\s?160,00 .*taxa: R\$\s?16,00/);
  assert.ok(!/\+ R\$\s?16,00/.test(text), "a taxa não parece crescimento");
  assert.match(text, /Ticket médio R\$\s?80,00 2 pedidos concluídos hoje/);
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
  assert.match(text, /Ticket médio R\$\s?60,00 1 pedido concluído hoje/);
  assert.match(text, /Pedido # ?9.*Pedido # ?8/); // mais recente primeiro
  assert.match(text, /Mesa 02 · 2x Burger/);
  assert.ok(!text.includes("Mesa 04"));
});

test("dashboard vazio não quebra e explica o estado", () => {
  const html = renderToString(createElement(Dashboard, { orders: [], tables: [] }));
  assert.match(html, /Nenhum pedido em aberto agora/);
  assert.match(html, /Nenhuma mesa cadastrada/);
  assert.match(html, /Sem vendas ainda hoje/);
});


test("saudação usa os limites dos períodos na hora local", () => {
  for (const [hour, minute, period, prefix] of [
    [4, 59, "night", "Boa noite"], [5, 0, "morning", "Bom dia"],
    [11, 59, "morning", "Bom dia"], [12, 0, "afternoon", "Boa tarde"],
    [17, 59, "afternoon", "Boa tarde"], [18, 0, "night", "Boa noite"],
  ]) {
    const date = new Date(2026, 10, 15, hour, minute);
    assert.equal(greetingPeriod(date), period);
    assert.ok(dashboardGreeting(date).startsWith(prefix));
  }
});

test("saudação é estável por data/período e varia por dia usando só a data local", () => {
  for (const hour of [5, 12, 18]) {
    const day = new Date(2026, 10, 15, hour);
    assert.equal(dashboardGreeting(day), dashboardGreeting(new Date(day)));
    assert.equal(dashboardGreeting(day), dashboardGreeting(new Date(2026, 10, 15, hour + 1, 59)));
    assert.notEqual(dashboardGreeting(day), dashboardGreeting(new Date(2026, 10, 16, hour)));
  }
  // Mesma noite local, mesmo quando a data UTC pode virar no fim do dia.
  assert.equal(dashboardGreeting(new Date(2026, 10, 15, 18)), dashboardGreeting(new Date(2026, 10, 15, 23, 59)));
  for (const [year, month, day] of [[2026, 11, 31], [2028, 1, 29]]) {
    const date = new Date(year, month, day, 12);
    const tomorrow = new Date(year, month, day + 1, 12);
    assert.notEqual(dashboardGreeting(date), dashboardGreeting(tomorrow));
  }
});

test("cada período tem três frases e sempre usa a saudação correta", () => {
  for (const [hour, prefix] of [[9, "Bom dia"], [15, "Boa tarde"], [23, "Boa noite"]]) {
    const phrases = new Set(Array.from({ length: 9 }, (_, day) => dashboardGreeting(new Date(2026, 10, day + 1, hour))));
    assert.equal(phrases.size, 3);
    for (const phrase of phrases) assert.ok(phrase.startsWith(prefix));
  }
});

test("C: sem vendas hoje não mostra '-100% vs. ontem'", () => {
  const html = renderToString(createElement(Dashboard, { orders: [closed(3, dayKey(1), [40])], tables: [] }));
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Vendas hoje R\$\s?0,00 Sem vendas ainda hoje/);
  assert.ok(!text.includes("-100%") && !text.includes("−100%"));
});
