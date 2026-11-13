import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server, ClientTabBar, CartContext, Orders, RestaurantInfo, paths;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true } });
  ({ ClientTabBar } = await server.ssrLoadModule("/src/components/layout/ClientTabBar.tsx"));
  ({ CartContext } = await server.ssrLoadModule("/src/contexts/CartContext.ts"));
  ({ Orders } = await server.ssrLoadModule("/src/pages/client/Orders/index.tsx"));
  ({ RestaurantInfo } = await server.ssrLoadModule("/src/components/layout/RestaurantInfo.tsx"));
  paths = await server.ssrLoadModule("/src/routers/paths.ts");
});
after(async () => { await server?.close(); });
const render = (component, props = {}) => renderToStaticMarkup(h(CartContext.Provider, { value: { itemCount: 3 } }, h(component, props)));

test("abas na ordem solicitada, contador do carrinho e apenas um destino ativo", () => {
  for (const [activeId, label] of [["menu", "Cardápio"], ["order", "Carrinho (3)"], ["orders", "Pedidos"], ["bill", "Conta"]]) {
    const html = render(ClientTabBar, { activeId, onMenu() {}, onOrder() {}, onNavigate() {} });
    const labels = [...html.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]);
    assert.deepEqual(labels, ["Cardápio", "Carrinho (3)", "Pedidos", "Conta"]);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.ok(html.includes(`aria-current="page"`));
    assert.match(html, new RegExp(`aria-current="page"[\\s\\S]*?<span>${label.replace(/[()]/g, "\\$&")}<`));
  }
  assert.equal(paths.clientPaths.order, "/carrinho");
  assert.equal(paths.clientPaths.orders, "/pedidos");
  assert.deepEqual(paths.clientTarget(paths.clientPaths.orders, "?mesa=a%2Bb&origem=qr"), { pathname: "/pedidos", search: "?mesa=a%2Bb&origem=qr" });
});

test("Pedidos apresenta estado inicial de carregamento", () => {
  const html = render(Orders, {
    tableToken: "token-teste",
    onNavigate() {},
  });

  assert.match(html, /Carregando pedidos/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /ainda não está disponível/);
});

test("informações do restaurante usam diálogo nativo e campos sem dados fictícios", () => {
  const html = render(RestaurantInfo);
  assert.match(html, /aria-label="Informações do restaurante"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /<dialog[^>]+aria-labelledby=/);
  assert.equal((html.match(/Não informado/g) ?? []).length, 4);
  for (const label of ["Nome", "Endereço", "Horário de funcionamento", "Contato"]) assert.ok(html.includes(label));
  const supplied = render(RestaurantInfo, { details: { name: "Nome fornecido", address: "Endereço fornecido", openingHours: "Horário fornecido", contact: "Contato fornecido" } });
  assert.doesNotMatch(supplied, /Não informado/);
  assert.match(supplied, /Nome fornecido/);
});
