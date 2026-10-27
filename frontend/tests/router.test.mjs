import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router";
import { createServer } from "vite";

let server;
let AdminRoutes;
let ClientRoutes;
let paths;
const previousWindow = globalThis.window;
const previousStorage = globalThis.localStorage;

before(async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  globalThis.window = {
    location: { protocol: "http:", hostname: "localhost", search: "" },
  };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  ({ AdminRoutes } = await server.ssrLoadModule(
    "/src/routers/AdminRoutes.tsx",
  ));
  ({ ClientRoutes } = await server.ssrLoadModule(
    "/src/routers/ClientRoutes.tsx",
  ));
  paths = await server.ssrLoadModule("/src/routers/paths.ts");
});

after(async () => {
  await server?.close();
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

// Renderiza as definições reais de rota, sem depender de um servidor de API.
const cases = [
  ["/admin/dashboard", "Bom dia, equipe!"],
  ["/admin/pedidos", "Pedidos registrados"],
  ["/admin/mesas", "Mapa de mesas"],
  ["/admin/cardapio", "Produtos cadastrados"],
  ["/admin/cardapio/produtos", "Todos os produtos"],
  ["/admin/cardapio/categorias", "Categorias cadastradas"],
  ["/admin/cardapio/categorias/todas", "Todas as categorias"],
  ["/cardapio?mesa=token-teste", "Cardápio"],
  ["/cliente?mesa=12", "Mesa 12"],
  ["/produto/demo-risoto?mesa=12", "Risoto de cogumelos"],
  ["/carrinho?mesa=12", "carrinho"],
  ["/conta?mesa=12", "conta"],
  ["/confirmar-pedido?mesa=12", "pedido"],
];

for (const [url, expected] of cases) {
  test(`acesso direto a ${url}`, () => {
    window.location.search = new URL(url, "http://localhost").search;
    const tree = createElement(
      MemoryRouter,
      { initialEntries: [url] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/admin/*",
          element: createElement(AdminRoutes),
        }),
        createElement(Route, {
          path: "/*",
          element: createElement(ClientRoutes),
        }),
      ),
    );
    const html = renderToString(tree);
    assert.ok(html.toLocaleLowerCase().includes(expected.toLocaleLowerCase()));
    if (url === "/admin/pedidos") {
      assert.ok(html.includes("Finalizar pedido"));
      assert.ok(!html.includes("Regredir status"));
      assert.ok(!html.includes("Iniciar preparo"));
    }
    if (!url.startsWith("/admin")) {
      assert.ok(!html.includes('href="/acompanhar'));
      assert.ok(!html.includes('>Status<'));
    }
  });
}

test("navegação do cliente preserva o token exato do QR em todos os destinos", () => {
  const search = "?mesa=a%2Bb%2Fc&origem=qr";
  for (const pathname of Object.values(paths.clientPaths)) {
    const target = paths.clientTarget(pathname, search);
    assert.equal(target.pathname, pathname);
    assert.equal(target.search, search);
    assert.equal(new URLSearchParams(target.search).get("mesa"), "a+b/c");
  }
});
