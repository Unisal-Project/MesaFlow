import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server, reportUtils, ReportSalesChart, tableUtils;
const previous = { window: globalThis.window, localStorage: globalThis.localStorage };
before(async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  reportUtils = await server.ssrLoadModule("/src/pages/admin/Reports/utils/report.utils.ts");
  ({ ReportSalesChart } = await server.ssrLoadModule("/src/pages/admin/Reports/components/ReportSalesChart.tsx"));
  tableUtils = await server.ssrLoadModule("/src/pages/admin/Table/utils/table.utils.ts");
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

const dayKey = (start, offset) => new Date(Date.parse(`${start}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
const days = (count, start = "2026-01-01") =>
  Array.from({ length: count }, (_, index) => ({
    date: dayKey(start, index), revenue: 10, orders: 1, tables: 1, serviceFee: 0, cancellations: 0, payments: {}, products: [],
  }));

test("B15: até 31 dias uma barra por dia; depois semana (segunda a domingo); acima de 26 semanas, mês", () => {
  const daily = reportUtils.bucketReportDays(days(31));
  assert.equal(daily.length, 31);
  assert.ok(daily.every((bucket) => bucket.kind === "day" && bucket.days.length === 1));

  // 01/01/2026 é quinta: a 1ª semana tem 4 dias (qui–dom) e as seguintes começam na segunda.
  const weekly = reportUtils.bucketReportDays(days(60));
  assert.equal(weekly[0].kind, "week");
  assert.equal(weekly[0].days.length, 4);
  assert.equal(weekly[1].date, "2026-01-05");
  assert.equal(weekly[1].days.length, 7);
  assert.equal(weekly.reduce((sum, bucket) => sum + bucket.revenue, 0), 600, "nada se perde ao agrupar");

  const monthly = reportUtils.bucketReportDays(days(366, "2025-11-17"));
  assert.equal(monthly.length, 13);
  assert.ok(monthly.every((bucket) => bucket.kind === "month"));
  assert.equal(monthly[0].days.length, 14); // 17 a 30/11/2025
  assert.equal(monthly.reduce((sum, bucket) => sum + bucket.days.length, 0), 366);
});

test("B14: ranking por productId; nomes iguais ficam separados e vale o nome atual", () => {
  const product = (productId, name, quantity) => ({ productId, name, quantity });
  const list = [
    { ...days(1)[0], products: [product("1", "X-Salada", 2), product("2", "X-Salada", 1)] },
    { ...days(1)[0], products: [product("1", "X-Salada Nova", 3)] },
  ];
  assert.deepEqual(reportUtils.rankProducts(list), [
    { productId: "1", name: "X-Salada Nova", quantity: 5 },
    { productId: "2", name: "X-Salada", quantity: 1 },
  ]);
});

test("B15: o gráfico é UMA parada de Tab (roving tabindex) e a barra selecionada é a ativa", () => {
  const bars = days(40).map((day, index) => ({ date: day.date, revenue: index, label: String(index), fullLabel: `dia ${index}` }));
  const html = (selectedDate) => renderToStaticMarkup(createElement(ReportSalesChart, { days: bars, selectedDate, onSelectDay() {} }));
  const count = (text, pattern) => (text.match(pattern) ?? []).length;
  assert.equal(count(html(null), /tabindex="0"/g), 1);
  assert.equal(count(html(null), /tabindex="-1"/g), 39);
  const selected = html(bars[7].date);
  assert.equal(count(selected, /tabindex="0"/g), 1);
  assert.match(selected, /aria-label="dia 7: [^"]*"[^>]*|tabindex="0"[^>]*aria-pressed="true"/);
});

test("B16: período inválido não mostra 'nenhuma venda' como se fosse dado", () => {
  const html = renderToStaticMarkup(createElement(ReportSalesChart, { days: [], selectedDate: null, onSelectDay() {}, unavailable: true }));
  assert.match(html, /Gráfico indisponível/);
  assert.ok(!html.includes("Nenhuma venda"));
  const empty = renderToStaticMarkup(createElement(ReportSalesChart, { days: [], selectedDate: null, onSelectDay() {} }));
  assert.match(empty, /Nenhuma venda no período selecionado/);
});

test("B17: tempo da mesa vira horas a partir de 60 min", () => {
  const { formatElapsed } = tableUtils;
  assert.equal(formatElapsed(0), "Há 0 min");
  assert.equal(formatElapsed(59.9), "Há 59 min");
  assert.equal(formatElapsed(60), "Há 1 h 00");
  assert.equal(formatElapsed(365), "Há 6 h 05");
  assert.equal(formatElapsed(-5), "Há 0 min");
});

test("B11: avisos e lista operacional usam as rotas enxutas", async () => {
  const orders = await server.ssrLoadModule("/src/services/orders.service.ts");
  const previousFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(String(url).replace(/^.*\/api\/v1/, "")); return Response.json([]); };
  try {
    await orders.fetchOperationalOrders();
    await orders.fetchOrderSummaries();
    await orders.fetchAdminOrders(30);
  } finally { globalThis.fetch = previousFetch; }
  assert.deepEqual(urls, [
    "/orders?scope=operational",
    "/orders?scope=operational&view=summary",
    "/orders?days=30",
  ]);
});

test("B09: datas padrão do relatório seguem a virada que chega depois, até o usuário escolher", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-16T05:30:00Z") }); // 02:30 em São Paulo
  const hookServer = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [{ name: "reports-hook-runtime", enforce: "pre", transform(code, id) {
      if (id.endsWith("/Reports/hooks/useReports.ts")) return code.replace('from "react"', 'from "/tests/helpers/hook-runtime.mjs"');
    } }],
  });
  try {
    const { useReports } = await hookServer.ssrLoadModule("/src/pages/admin/Reports/hooks/useReports.ts");
    const { createHookRunner } = await hookServer.ssrLoadModule("/tests/helpers/hook-runtime.mjs");
    const businessDay = await hookServer.ssrLoadModule("/src/utils/businessDay.ts");
    const run = createHookRunner(() => useReports());
    assert.equal(run().endDate, "2026-11-15", "virada padrão 05:00: ainda é o dia 15");
    businessDay.setDayCutoff(0); // a virada de /settings chega depois da montagem
    try {
      assert.equal(run().endDate, "2026-11-16", "sem escolha do usuário, o padrão acompanha a virada");
      assert.equal(run().startDate, "2026-11-10");
      run().setEndDate("2026-11-01");
      businessDay.setDayCutoff(5);
      assert.equal(run().endDate, "2026-11-01", "depois de escolher, a data não muda sozinha");
    } finally { businessDay.setDayCutoff(5); }
  } finally { await hookServer.close(); }
});

test("B: rótulos do eixo — 7 no desktop e 4 no celular, sem sobreposição no fim", () => {
  const labelsFor = (count) => {
    const bars = days(count).map((day, index) => ({ date: day.date, revenue: index, label: `d${index}`, fullLabel: `dia ${index}` }));
    const html = renderToStaticMarkup(createElement(ReportSalesChart, { days: bars, selectedDate: null, onSelectDay() {} }));
    const tags = [...html.matchAll(/<text[^>]*data-(?:wide|narrow)[^>]*>[^<]*<\/text>/g)].map((match) => match[0]);
    const indexes = (attribute) => tags.filter((tag) => tag.includes(attribute)).map((tag) => Number(tag.match(/>d(\d+)</)[1]));
    return { tags, wide: indexes("data-wide"), narrow: indexes("data-narrow") };
  };
  const thirtyOne = labelsFor(31);
  assert.deepEqual(thirtyOne.wide, [0, 5, 10, 15, 20, 25, 30], "ceil(31/7)=5; o último já é múltiplo");
  assert.deepEqual(thirtyOne.narrow, [0, 8, 16, 30], "ceil(31/4)=8: o 24 sairia a 6 barras do 30 e é descartado");
  assert.ok(thirtyOne.tags.every((tag) => tag.includes('aria-hidden="true"')));
  // 90 barras: espaçamento mínimo entre rótulos vizinhos, sempre com o último no fim.
  const ninety = labelsFor(90);
  for (const [list, every] of [[ninety.wide, Math.ceil(90 / 7)], [ninety.narrow, Math.ceil(90 / 4)]]) {
    assert.equal(list.at(-1), 89);
    list.slice(1).forEach((value, position) => assert.ok(value - list[position] >= every, `${list[position]}→${value}`));
  }
  assert.deepEqual(ninety.narrow, [0, 23, 46, 89]);
});

