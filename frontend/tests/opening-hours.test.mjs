import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
let server, hours, RestaurantInfo;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true } });
  hours = await server.ssrLoadModule("/src/utils/opening-hours.ts");
  ({ RestaurantInfo } = await server.ssrLoadModule("/src/components/layout/RestaurantInfo.tsx"));
});
after(async () => { await server?.close(); });
test("sete dias cabem no campo existente e aceitam fechamento depois da meia-noite", () => {
  const days = hours.emptyOpeningHours();
  days[0] = { ...days[0], open: true, from: "18:00", to: "02:00" };
  const saved = hours.serializeOpeningHours(days);
  assert.ok(saved.length <= 255);
  assert.deepEqual(hours.parseOpeningHours(saved), days);
  assert.equal(hours.openingHoursError(saved), "");
  assert.equal(hours.parseOpeningHours("18h–23h"), null);
  assert.equal(hours.openingHoursError("18h–23h"), "");
  days[0].to = "";
  assert.match(hours.openingHoursError(hours.serializeOpeningHours(days)), /segunda-feira/);
  days[0].to = days[0].from;
  assert.match(hours.openingHoursError(hours.serializeOpeningHours(days)), /diferentes/);
});
test("informações públicas exibem os dias sem perder compatibilidade com horários antigos", () => {
  const days = hours.emptyOpeningHours();
  days[0] = { ...days[0], open: true, from: "18:00", to: "02:00" };
  const html = renderToStaticMarkup(createElement(RestaurantInfo, { details: { openingHours: hours.serializeOpeningHours(days) } }));
  assert.match(html, /Segunda-feira/);
  assert.match(html, /18:00 – 02:00 \(dia seguinte\)/);
  assert.match(html, /Fechado/);
  assert.match(renderToStaticMarkup(createElement(RestaurantInfo, { details: { openingHours: "18h–23h" } })), /18h–23h/);
});
