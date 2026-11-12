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
  hook = await server.ssrLoadModule("/src/pages/admin/Reports/hooks/useReports.ts");
  orders = await server.ssrLoadModule("/src/services/orders.service.ts");
});
after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

test("variação percentual usa uma casa e não inventa base zero", () => {
  assert.equal(hook.percentChange(110, 100), 10);
  assert.equal(hook.percentChange(90, 120), -25);
  assert.equal(hook.percentChange(1, 3), -66.7);
  assert.equal(hook.percentChange(50, 0), null);
});

test("relatório envia o período e o fuso do navegador", async () => {
  let requested;
  globalThis.fetch = async (url) => {
    requested = new URL(url);
    return Response.json({ start: "2026-11-01", end: "2026-11-07", days: [], previous: { revenue: 0, orders: 0, tables: 0 }, activeCategories: 0 });
  };
  await orders.fetchSalesReport("2026-11-01", "2026-11-07");
  assert.equal(requested.pathname, "/api/v1/reports/sales");
  assert.equal(requested.searchParams.get("start"), "2026-11-01");
  assert.equal(requested.searchParams.get("end"), "2026-11-07");
  assert.equal(requested.searchParams.get("tzOffset"), String(new Date().getTimezoneOffset()));
});

test("forma de pagamento: sem método vira Não informado e desconhecida não vira undefined", () => {
  assert.equal(hook.topMethodLabel(new Map()), "—");
  assert.equal(hook.topMethodLabel(new Map([["UNKNOWN", 30], ["PIX", 10]])), "Não informado (75%)");
  assert.equal(hook.topMethodLabel(new Map([["VOUCHER", 20]])), "VOUCHER (100%)");
});
