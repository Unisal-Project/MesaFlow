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
let payments;
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
  payments = await server.ssrLoadModule("/src/services/payment-confirmation.service.ts");
});

after(async () => {
  await server?.close();
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

// Renderiza as definições reais de rota, sem depender de um servidor de API.
const cases = [
  // A saudação muda com o horário; usa um título fixo do Dashboard.
  ["/admin/dashboard", "Operação em andamento"],
  ["/admin/pedidos", "Pedidos registrados"],
  ["/admin/mesas", "Mapa de mesas"],
  ["/admin/cardapio", "Produtos cadastrados"],
  ["/admin/cardapio/produtos", "Todos os produtos"],
  ["/admin/cardapio/categorias", "Categorias cadastradas"],
  ["/admin/cardapio/categorias/todas", "Todas as categorias"],
  ["/cardapio?mesa=token-teste", "Identificando sua mesa"],
  ["/cliente?mesa=12", "Identificando sua mesa"],
  ["/produto/1?mesa=12", "Identificando sua mesa"],
  ["/carrinho?mesa=12", "Identificando sua mesa"],
  ["/conta?mesa=12", "Identificando sua mesa"],
  ["/confirmar-pedido?mesa=12", "Identificando sua mesa"],
  ["/atendimento-finalizado", "Atendimento finalizado"],
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
      // Os pedidos vêm da API; a primeira renderização mostra o carregamento.
      assert.ok(html.includes("Carregando pedidos"));
      assert.ok(!html.includes("Regredir status"));
      assert.ok(!html.includes("Iniciar preparo"));
    }
    if (!url.startsWith("/admin")) {
      assert.ok(!html.includes('href="/acompanhar'));
      assert.ok(!html.includes(">Status<"));
    }
  });
}

test("prévia do cardápio exige login e usa a barra de abas do cliente", async () => {
  const { RequireAuth } = await server.ssrLoadModule(
    "/src/routers/AppRouter.tsx",
  );
  const render = (url, element) =>
    renderToString(
      createElement(
        MemoryRouter,
        { initialEntries: [url] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/login", element: "tela-login" }),
          createElement(Route, { path: "/admin/*", element }),
          createElement(Route, {
            path: "/*",
            element: createElement(ClientRoutes),
          }),
        ),
      ),
    );
  // Sem sessão o RequireAuth não renderiza nada do admin (redireciona).
  const guarded = render(
    "/admin/ver-cardapio",
    createElement(RequireAuth, null, createElement(AdminRoutes)),
  );
  assert.ok(!guarded.includes("client-menu"));
  const preview = render("/admin/ver-cardapio", createElement(AdminRoutes));
  assert.ok(preview.includes("Voltar ao painel"));
  assert.ok(preview.includes("client-tabbar"));
  assert.ok(!/prévia/i.test(preview));
  const client = render("/cardapio", createElement(AdminRoutes));
  assert.ok(client.includes("client-tabbar"));
  assert.ok(client.includes("Voltar ao início"));
});

test("Menu do cliente segue com a barra de abas e abre o detalhe", async () => {
  const { Menu } = await server.ssrLoadModule(
    "/src/pages/client/Menu/index.tsx",
  );
  const { CartContext } = await server.ssrLoadModule(
    "/src/contexts/CartContext.ts",
  );
  const html = renderToString(
    createElement(
      CartContext.Provider,
      { value: { itemCount: 0 } },
      createElement(Menu, {
        catalog: {
          categories: [{ id: "1", name: "Lanches", active: true }],
          products: [
            {
              id: "7",
              name: "X-Burger",
              categoryId: "1",
              price: "20",
              finalPrice: "20",
              available: true,
              active: true,
            },
          ],
        },
        onBack() {},
        onSelectProduct() {},
        onOpenCart() {},
      }),
    ),
  );
  assert.ok(html.includes("client-tabbar"));
  assert.ok(html.includes("Voltar ao início"));
  assert.ok(html.includes("Ver item: X-Burger"));
});

test("formulário de produto só oferece a prévia para produto salvo", async () => {
  const { ProductFormModal } = await server.ssrLoadModule(
    "/src/pages/admin/Products/components/ProductFormModal.tsx",
  );
  const { emptyPromoForm } = await server.ssrLoadModule(
    "/src/utils/promotion.ts",
  );
  const render = (editingProductId) =>
    renderToString(
      createElement(ProductFormModal, {
        categories: [{ id: "1", name: "Lanches" }],
        editingProductId,
        newProduct: {
          name: "X-Burger",
          category: "1",
          additionalCategoryIds: [],
          price: "20",
          quantity: "1",
          observation: "",
          imageUrl: "",
          trackStock: true,
          available: true,
          promo: emptyPromoForm,
        },
        products: [],
        setNewProduct() {},
        onClose() {},
        onSave() {},
        onPhotoChange() {},
        onDelete() {},
      }),
    );
  assert.ok(
    render("7").includes(
      'href="/admin/ver-cardapio?produto=7&amp;origem=produtos"',
    ),
  );
  assert.ok(!render(null).includes("/admin/ver-cardapio"));
});

test("configurações exige login e mostra a conta com o menu do usuário", async () => {
  const { RequireAuth } = await server.ssrLoadModule(
    "/src/routers/AppRouter.tsx",
  );
  const render = (element) =>
    renderToString(
      createElement(
        MemoryRouter,
        { initialEntries: ["/admin/configuracoes"] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/admin/*", element }),
        ),
      ),
    );
  const guarded = render(
    createElement(RequireAuth, null, createElement(AdminRoutes)),
  );
  assert.ok(!guarded.includes("Configurações"));
  const page = render(createElement(AdminRoutes));
  // Página de configurações renderiza (o formulário de troca de senha saiu da página em fa604b0).
  assert.ok(page.includes("Configurações"));
  // Disclosure: botão controla a lista; sem role=menu/menuitem.
  assert.match(page, /aria-controls="([^"]+)" aria-expanded="false"/);
  const menuId = page.match(/class="profile-area" aria-controls="([^"]+)"/)[1];
  assert.ok(
    page.includes(`id="${menuId}" class="admin-profile-menu" hidden=""`),
  );
  assert.ok(!/role="menu(item)?"/.test(page));
  assert.equal(paths.adminPaths.settings, "/admin/configuracoes");
});

test("Sair limpa a sessão e volta ao login sem histórico", async () => {
  const { signOut } = await server.ssrLoadModule(
    "/src/services/auth.service.ts",
  );
  const storage = new Map([["mesaflow.session", "{}"]]);
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const replaced = [];
  window.location.replace = (url) => replaced.push(url);
  try {
    signOut();
  } finally {
    globalThis.localStorage = previous;
    delete window.location.replace;
  }
  assert.equal(storage.has("mesaflow.session"), false);
  assert.deepEqual(replaced, ["/login"]);
});

test("navegação do cliente preserva o token exato do QR em todos os destinos", () => {
  const search = "?mesa=a%2Bb%2Fc&origem=qr";
  for (const pathname of Object.values(paths.clientPaths)) {
    const target = paths.clientTarget(pathname, search);
    assert.equal(target.pathname, pathname);
    assert.equal(target.search, search);
    assert.equal(new URLSearchParams(target.search).get("mesa"), "a+b/c");
  }
});

test("rota de confirmação carrega somente com a sessão da mesa e não expõe o recibo antes da consulta", () => {
  const previousSessionStorage = globalThis.sessionStorage;
  const sessions = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => sessions.get(key),
    setItem: (key, value) => sessions.set(key, value),
    removeItem: (key) => sessions.delete(key),
  };
  try {
    const renderConfirmation = (table) => renderToString(
      createElement(MemoryRouter, { initialEntries: [`/pagamento-confirmado?mesa=${table}`] },
        createElement(Routes, null, createElement(Route, {
          path: "/*",
          element: createElement(ClientRoutes),
        })),
      ),
    );
    payments.storePaymentSession("mesa-a", "sessao-assinada");
    assert.match(renderConfirmation("mesa-a"), /Consultando pagamento/);
    assert.doesNotMatch(renderConfirmation("mesa-b"), /Consultando pagamento|Pagamento confirmado/);
    payments.storePaymentSession("mesa-a", "");
    assert.doesNotMatch(renderConfirmation("mesa-a"), /Consultando pagamento|Pagamento confirmado/);
  } finally {
    globalThis.sessionStorage = previousSessionStorage;
  }
});
