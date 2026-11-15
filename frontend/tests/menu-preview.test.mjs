import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { createServer } from "vite";

let server,
  hooked,
  mod,
  RequireAuth,
  AdminRoutes,
  CartProvider,
  CartContext,
  createHookRunner,
  CartPreview,
  Cart,
  navigations;
const previous = {
  window: globalThis.window,
  localStorage: globalThis.localStorage,
  fetch: globalThis.fetch,
};
const storage = new Map();
const fetched = [];
const product = {
  id: "7",
  name: "X-Burger",
  description: "Pão e carne",
  categoryId: "1",
  price: "20",
  finalPrice: "20",
  available: true,
  active: true,
  trackStock: false,
};

before(async () => {
  globalThis.window = {
    location: { protocol: "http:", hostname: "localhost", search: "" },
  };
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.fetch = async (url) => {
    fetched.push(String(url));
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  mod = await server.ssrLoadModule(
    "/src/pages/admin/MenuPreview/ProductPreview.tsx",
  );
  ({ RequireAuth } = await server.ssrLoadModule("/src/routers/AppRouter.tsx"));
  ({ AdminRoutes } = await server.ssrLoadModule(
    "/src/routers/AdminRoutes.tsx",
  ));
  // Segunda instância só para o carrinho, com hooks controlados e efeitos imediatos.
  hooked = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: "cart-effects-now",
        enforce: "pre",
        transform(code, id) {
          if (id.endsWith("/contexts/CartProvider.tsx"))
            return code.replace(
              'from "react"',
              'from "/tests/helpers/effect-runtime.mjs"',
            );
          if (id.endsWith("/MenuPreview/PreviewPages.tsx"))
            return code
              .replace(
                'from "react"',
                'from "/tests/helpers/effect-runtime.mjs"',
              )
              .replace(
                'from "react-router"',
                'from "/tests/helpers/router-stub.mjs"',
              );
        },
      },
    ],
  });
  ({ CartProvider } = await hooked.ssrLoadModule(
    "/src/contexts/CartProvider.tsx",
  ));
  ({ createHookRunner } = await hooked.ssrLoadModule(
    "/tests/helpers/effect-runtime.mjs",
  ));
  ({ CartPreview } = await hooked.ssrLoadModule(
    "/src/pages/admin/MenuPreview/PreviewPages.tsx",
  ));
  ({ Cart } = await hooked.ssrLoadModule("/src/pages/client/Cart/index.tsx"));
  ({ navigations } = await hooked.ssrLoadModule(
    "/tests/helpers/router-stub.mjs",
  ));
  ({ CartContext } = await server.ssrLoadModule(
    "/src/contexts/CartContext.ts",
  ));
});

after(async () => {
  await server?.close();
  await hooked?.close();
  Object.assign(globalThis, previous);
});

// Componentes da prévia rodam dentro do carrinho do PreviewLayout.
const withCart = (element) =>
  createElement(
    CartContext.Provider,
    { value: { itemCount: 0, items: [], addItem() {} } },
    element,
  );

const renderAt = (url, element) =>
  renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: [url] },
      createElement(
        Routes,
        null,
        createElement(Route, { path: "/admin/*", element }),
      ),
    ),
  );

test("detalhe da prévia exige login e carrega o produto", () => {
  const guarded = renderAt(
    "/admin/ver-cardapio/produto/7",
    createElement(RequireAuth, null, createElement(AdminRoutes)),
  );
  assert.ok(!guarded.includes("Carregando produto"));
  assert.ok(
    renderAt(
      "/admin/ver-cardapio/produto/7",
      createElement(AdminRoutes),
    ).includes("Carregando produto"),
  );
});

test("card da prévia abre o detalhe", async () => {
  const { default: MenuPreview } = await server.ssrLoadModule(
    "/src/pages/admin/MenuPreview/index.tsx",
  );
  const html = renderAt(
    "/admin/ver-cardapio",
    withCart(
      createElement(MenuPreview, {
        catalog: {
          categories: [{ id: "1", name: "Lanches", active: true }],
          products: [product],
        },
      }),
    ),
  );
  assert.ok(html.includes("Ver item: X-Burger"));
  assert.ok(html.includes("client-tabbar"));
});

test("detalhe da prévia mostra o mesmo formulário do cliente com carrinho isolado", () => {
  const backs = [];
  const props = {
    product,
    categoryName: "Lanches",
    onBack: () => backs.push("back"),
    onNavigate: (to) => backs.push(to),
  };
  const html = renderToString(
    withCart(createElement(mod.ProductPreviewView, props)),
  );
  assert.ok(html.includes("Adicionar ao pedido"));
  assert.ok(html.includes("Observações"));

  // O carrinho é o do PreviewLayout: o detalhe não cria outro.
  const detail = mod.ProductPreviewView(props).props;
  assert.equal(detail.onAdded, props.onBack);
  detail.onGoToCart();
  assert.deepEqual(backs, ["order"]);
  backs.length = 0;

  // "Adicionar ao pedido" = addItem no carrinho da prévia + onAdded.
  const run = createHookRunner(() =>
    CartProvider({ children: null, storageKey: "mesaflow:cart:admin-preview" }),
  );
  run().props.value.addItem(product, 1, [""]);
  run();
  detail.onAdded();
  assert.deepEqual(backs, ["back"]);
  assert.equal(
    JSON.parse(storage.get("mesaflow:cart:admin-preview")).length,
    1,
  );
  assert.equal(storage.has("mesaflow:cart"), false);
  assert.ok(!fetched.some((url) => /\/orders|\/tables\/by-token/.test(url)));
});

test("voltar da prévia: aberta pelo produto vai aos produtos, senão ao painel", async () => {
  const { previewBack } = await server.ssrLoadModule(
    "/src/pages/admin/MenuPreview/preview.ts",
  );
  assert.deepEqual(
    previewBack(new URLSearchParams("produto=7&origem=produtos")),
    {
      path: "/admin/cardapio",
      label: "Voltar aos produtos",
    },
  );
  assert.deepEqual(previewBack(new URLSearchParams("produto=7")), {
    path: "/admin/dashboard",
    label: "Voltar ao painel",
  });
  assert.deepEqual(previewBack(new URLSearchParams("")), {
    path: "/admin/dashboard",
    label: "Voltar ao painel",
  });
  const { default: MenuPreview } = await server.ssrLoadModule(
    "/src/pages/admin/MenuPreview/index.tsx",
  );
  const catalog = {
    categories: [{ id: "1", name: "Lanches", active: true }],
    products: [product],
  };
  assert.ok(
    renderAt(
      "/admin/ver-cardapio?produto=7&origem=produtos",
      withCart(createElement(MenuPreview, { catalog })),
    ).includes("Voltar aos produtos"),
  );
  assert.ok(
    renderAt(
      "/admin/ver-cardapio",
      withCart(createElement(MenuPreview, { catalog })),
    ).includes("Voltar ao painel"),
  );
});

test("entrar na prévia limpa só o carrinho isolado", async () => {
  const { resetPreviewCart, PREVIEW_CART_KEY } = await server.ssrLoadModule(
    "/src/pages/admin/MenuPreview/preview.ts",
  );
  storage.set(PREVIEW_CART_KEY, "[1]");
  storage.set("mesaflow:cart", "[2]");
  resetPreviewCart();
  assert.equal(storage.has(PREVIEW_CART_KEY), false);
  assert.equal(storage.get("mesaflow:cart"), "[2]");
  storage.delete("mesaflow:cart");
});

test("link da prévia no formulário: desativado com alterações pendentes", async () => {
  const { ProductFormModal } = await server.ssrLoadModule(
    "/src/pages/admin/Products/components/ProductFormModal.tsx",
  );
  const { emptyPromoForm } = await server.ssrLoadModule(
    "/src/utils/promotion.ts",
  );
  const render = (hasUnsavedChanges) =>
    renderToString(
      createElement(ProductFormModal, {
        categories: [{ id: "1", name: "Lanches" }],
        editingProductId: "7",
        hasUnsavedChanges,
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
  const dirty = render(true);
  assert.ok(dirty.includes("Salve as alterações para ver a prévia"));
  assert.ok(!dirty.includes("/admin/ver-cardapio"));
  assert.match(
    dirty,
    /<button[^>]*disabled=""[^>]*aria-describedby="product-preview-hint"/,
  );
  const clean = render(false);
  assert.ok(
    clean.includes('href="/admin/ver-cardapio?produto=7&amp;origem=produtos"'),
  );
  assert.ok(!clean.includes("Salve as alterações"));
});

test("carrinho e conta da prévia exigem login e usam as telas do cliente", () => {
  const guard = (url) =>
    renderAt(url, createElement(RequireAuth, null, createElement(AdminRoutes)));
  assert.equal(guard("/admin/ver-cardapio/carrinho"), "");
  assert.equal(guard("/admin/ver-cardapio/conta"), "");
  const cart = renderAt(
    "/admin/ver-cardapio/carrinho",
    createElement(AdminRoutes),
  );
  assert.ok(cart.includes("Seu pedido"));
  assert.ok(cart.includes("client-tabbar"));
  const bill = renderAt(
    "/admin/ver-cardapio/conta",
    createElement(AdminRoutes),
  );
  assert.ok(bill.includes("client-tabbar"));
  assert.ok(bill.includes("Prévia sem mesa"));
  assert.ok(!bill.includes("Mesa não identificada"));
  assert.ok(bill.includes("Conta da mesa"));
});

test("carrinho da prévia zera ao entrar no grupo e as telas internas não o apagam", async () => {
  const key = "mesaflow:cart:admin-preview";
  const line = JSON.stringify([{ id: "l1", product, quantity: 2, notes: "" }]);
  // Telas internas (cardápio) não zeram: o carrinho segue entre cardápio ↔ carrinho.
  storage.set(key, line);
  const { default: MenuPreview } = await server.ssrLoadModule(
    "/src/pages/admin/MenuPreview/index.tsx",
  );
  renderAt(
    "/admin/ver-cardapio",
    withCart(
      createElement(MenuPreview, { catalog: { categories: [], products: [] } }),
    ),
  );
  assert.equal(storage.get(key), line);
  // Entrar no grupo (PreviewLayout) zera antes de ler o carrinho.
  const html = renderAt(
    "/admin/ver-cardapio/carrinho",
    createElement(AdminRoutes),
  );
  assert.equal(storage.has(key), false);
  assert.ok(html.includes("Seu carrinho está vazio"));
});

test("Continuar no carrinho da prévia avisa e não envia pedido", () => {
  fetched.length = 0;
  navigations.length = 0;
  const run = createHookRunner(() => CartPreview());
  const cart = () => run().props.children.find((child) => child?.type === Cart);
  assert.equal(cart().props.allowOrdering, false);
  assert.ok(
    !JSON.stringify(run().props.children[1] ?? null).includes("Admin não pode"),
  );
  cart().props.onReview();
  const notice = run().props.children[1];
  assert.match(JSON.stringify(notice.props), /Admin não pode realizar pedido/);
  assert.ok(!fetched.some((url) => /\/orders|\/tables\/by-token/.test(url)));
  cart().props.onNavigate("bill");
  cart().props.onGoToMenu();
  assert.deepEqual(navigations, [
    "/admin/ver-cardapio/conta",
    "/admin/ver-cardapio",
  ]);
});


test("prévia do admin usa a mesma imagem original do cardápio do cliente (fiel), mesmo com thumb", async () => {
  const { default: MenuPreview } = await server.ssrLoadModule("/src/pages/admin/MenuPreview/index.tsx");
  for (const thumbUrls of [["/uploads/a-thumb.webp"], undefined]) {
    const html = renderAt("/admin/ver-cardapio", withCart(createElement(MenuPreview, {
      catalog: { categories: [{ id: "1", name: "Lanches", active: true }], products: [{ ...product, imageUrl: "/uploads/a.webp", thumbUrls }] },
    })));
    assert.ok(html.includes('/a.webp"'));
    assert.ok(!html.includes("a-thumb.webp"));
  }
});
