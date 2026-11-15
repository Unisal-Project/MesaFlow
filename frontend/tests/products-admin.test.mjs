import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, useProducts, createHookRunner;
const previous = {
  fetch: globalThis.fetch,
  window: globalThis.window,
  localStorage: globalThis.localStorage,
};
before(async () => {
  globalThis.window = {
    location: {
      protocol: "http:",
      hostname: "localhost",
      origin: "http://localhost:5173",
    },
  };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      {
        name: "controlled-product-hook-renders",
        enforce: "pre",
        transform(code, id) {
          if (id.endsWith("/Products/hooks/useProducts.ts"))
            return code.replace(
              'from "react"',
              'from "/tests/helpers/hook-runtime.mjs"',
            );
        },
      },
    ],
  });
  ({ useProducts } = await server.ssrLoadModule(
    "/src/pages/admin/Products/hooks/useProducts.ts",
  ));
  ({ createHookRunner } = await server.ssrLoadModule(
    "/tests/helpers/hook-runtime.mjs",
  ));
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

for (const failReload of [false, true])
  test(`image retry keeps one product, including catalog reload failure: ${failReload}`, async () => {
    const calls = [];
    let imageAttempts = 0;
    const product = {
      id: "8",
      name: "Suco",
      price: "12.00",
      categoryId: "1",
      additionalCategoryIds: [],
      available: true,
      active: true,
      stockQuantity: 4,
      description: null,
      imageUrl: null,
    };
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname.replace("/api/v1", "");
      calls.push(`${options.method ?? "GET"} ${path}`);
      if (path.endsWith("/image")) {
        if (++imageAttempts === 1)
          return Response.json(
            { message: "Falha ao enviar imagem" },
            { status: 503 },
          );
        return Response.json({
          ...product,
          imageUrl: "/uploads/products/suco.webp",
        });
      }
      if (!options.method && failReload) throw new Error("offline");
      return Response.json(options.method ? product : [product]);
    };
    const render = createHookRunner(() =>
      useProducts([{ id: "1", name: "Bebidas" }]),
    );
    let hook = render();
    hook.openNewProduct();
    hook = render();
    hook.setNewProduct({
      ...hook.newProduct,
      name: "Suco",
      price: "12",
      quantity: "4",
      category: "1",
    });
    hook.handlePhotoChange({
      target: {
        files: [new File(["photo"], "suco.png", { type: "image/png" })],
      },
    });
    hook = render();
    await hook.handleSaveProduct({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    hook = render();
    assert.equal(hook.editingProductId, "8");
    assert.match(hook.error, /Falha ao enviar imagem/);
    assert.equal(hook.isProductModalOpen, true);
    assert.equal(hook.products.length, 1);
    await hook.handleSaveProduct({ preventDefault() {} });
    hook = render();
    assert.equal(calls.filter((call) => call === "POST /products").length, 1);
    assert.equal(
      calls.filter((call) => call === "PATCH /products/8").length,
      1,
    );
    assert.equal(imageAttempts, 2);
    assert.equal(hook.isProductModalOpen, false);
    assert.match(hook.products[0].imageUrl, /uploads\/products\/suco.webp$/);
  });

test("produto sem controle de estoque salva sem exigir nem enviar quantidade", async () => {
  let body;
  globalThis.fetch = async (url, options) => {
    if (!options.method) return Response.json([]);
    body = JSON.parse(options.body);
    return Response.json({ id: "9", ...body, price: "5.00", imageUrl: null });
  };
  const render = createHookRunner(() =>
    useProducts([{ id: "1", name: "Bebidas" }]),
  );
  let hook = render();
  hook.openNewProduct();
  hook = render();
  hook.setNewProduct({
    ...hook.newProduct,
    name: "Água",
    price: "5",
    quantity: "",
    trackStock: false,
    category: "1",
  });
  hook = render();
  await hook.handleSaveProduct({ preventDefault() {} });
  hook = render();
  assert.equal(hook.error, "");
  assert.equal(body.trackStock, false);
  assert.equal("stockQuantity" in body, false);
});

test("salvar produto envia a promoção e a lista mostra o preço final do backend", async () => {
  let body;
  globalThis.fetch = async (url, options) => {
    if (!options.method) return Response.json([]);
    body = JSON.parse(options.body);
    return Response.json({
      id: "9",
      ...body,
      price: "20.00",
      finalPrice: "16.00",
      promotion: { type: "PERCENT", value: "20", source: "PRODUCT" },
      imageUrl: null,
    });
  };
  const render = createHookRunner(() =>
    useProducts([{ id: "1", name: "Bebidas" }]),
  );
  let hook = render();
  hook.openNewProduct();
  hook = render();
  hook.setNewProduct({
    ...hook.newProduct,
    name: "Suco",
    price: "20",
    category: "1",
    promo: { ...hook.newProduct.promo, promoValue: "20", promoActive: true },
  });
  hook = render();
  await hook.handleSaveProduct({ preventDefault() {} });
  hook = render();
  assert.deepEqual(
    {
      promoType: body.promoType,
      promoValue: body.promoValue,
      promoActive: body.promoActive,
    },
    { promoType: "PERCENT", promoValue: 20, promoActive: true },
  );
  assert.equal("price" in body && body.price, 20);
  assert.equal(hook.products[0].finalPriceValue, 16);
  assert.equal(hook.products[0].promotion.source, "PRODUCT");
});

test("formulário de edição detecta alterações não salvas", () => {
  const render = createHookRunner(() => useProducts([{ id: "1", name: "Bebidas" }]));
  let hook = render();
  hook.openEditProduct({
    id: "8", name: "Suco", quantity: 4, categoryId: "1", additionalCategoryIds: [],
    imageUrl: "", observation: "", trackStock: true, available: true,
  });
  hook = render();
  assert.equal(hook.hasUnsavedChanges, false);
  hook.setNewProduct({ ...hook.newProduct, name: "Suco de laranja" });
  hook = render();
  assert.equal(hook.hasUnsavedChanges, true);
});


test("novo produto inicia sem controlar estoque e envia false; edição preserva o salvo", async () => {
  let body;
  globalThis.fetch = async (_url, options = {}) => {
    if (!options.method) return Response.json([]);
    body = JSON.parse(options.body);
    return Response.json({ id: "9", ...body, price: "5.00", imageUrl: null });
  };
  const render = createHookRunner(() => useProducts());
  render().openNewProduct();
  assert.equal(render().newProduct.trackStock, false);
  render().setNewProduct({ ...render().newProduct, name: "Água", price: "5", category: "1" });
  await render().handleSaveProduct({ preventDefault() {} });
  assert.equal(body.trackStock, false);
  assert.equal("stockQuantity" in body, false);
  for (const trackStock of [true, false]) {
    render().openEditProduct({ id: "9", name: "Água", quantity: 2, categoryId: "1",
      additionalCategoryIds: [], trackStock, available: true });
    assert.equal(render().newProduct.trackStock, trackStock);
  }
  render().openNewProduct();
  assert.equal(render().newProduct.trackStock, false);
});
