import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, menu;
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
  menu = await server.ssrLoadModule("/src/services/menu.service.ts");
});
after(async () => {
  await server?.close();
  globalThis.fetch = previousFetch;
  globalThis.window = previousWindow;
  globalThis.localStorage = previousStorage;
});

// O backend usa schema .strict(): qualquer campo extra derruba a requisição.
const input = { name: "Bebidas", description: null, active: true };

test("criar categoria faz POST /categories só com os campos aceitos", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/api\/v1\/categories$/);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), input);
    return Response.json({ id: "1", ...input }, { status: 201 });
  };
  assert.equal((await menu.saveCategory(input)).id, "1");
});

test("editar categoria faz PUT /categories/:id", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/categories\/1$/);
    assert.equal(options.method, "PUT");
    return Response.json({ id: "1", ...input });
  };
  await menu.saveCategory(input, "1");
});

test("excluir categoria com produtos propaga o 409 do backend", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/categories\/1$/);
    assert.equal(options.method, "DELETE");
    return Response.json(
      { message: "Não é possível excluir uma categoria que possui produtos" },
      { status: 409 },
    );
  };
  await assert.rejects(menu.removeCategory("1"), /possui produtos/);
});

test("excluir categoria aceita 204 sem corpo", async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await menu.removeCategory("1"), undefined);
});

const productInput = {
  name: "Suco",
  description: null,
  price: 9.9,
  stockQuantity: 10,
  available: true,
  categoryId: "1",
};

test("criar produto faz POST /products com preço numérico", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/api\/v1\/products$/);
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), productInput);
    return Response.json({ id: "5", ...productInput, price: "9.9", imageUrl: null }, { status: 201 });
  };
  assert.equal((await menu.saveProduct(productInput)).id, "5");
});

test("editar produto usa PATCH e envia só os campos alterados", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/products\/5$/);
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), { stockQuantity: 3 });
    return Response.json({ id: "5", imageUrl: null });
  };
  await menu.saveProduct({ stockQuantity: 3 }, "5");
});

test("upload de imagem usa multipart com o campo image", async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/products\/5\/image$/);
    assert.ok(options.body instanceof FormData);
    assert.ok(options.body.get("image"));
    // O navegador define o boundary; o cliente não pode fixar Content-Type.
    assert.equal(options.headers.get("Content-Type"), null);
    return Response.json({ id: "5", imageUrl: "/uploads/products/a.png" });
  };
  const saved = await menu.uploadProductImage("5", new File(["x"], "a.png", { type: "image/png" }));
  assert.equal(saved.imageUrl, "http://localhost:3333/uploads/products/a.png");
});

test("imagens relativas apontam para o backend; absolutas ficam como estão", async () => {
  globalThis.fetch = async () =>
    Response.json([
      { id: "1", imageUrl: "/uploads/products/b.png" },
      { id: "2", imageUrl: "https://cdn.exemplo.com/c.png" },
      { id: "3", imageUrl: null },
    ]);
  const [a, b, c] = await menu.fetchProducts();
  assert.equal(a.imageUrl, "http://localhost:3333/uploads/products/b.png");
  assert.equal(b.imageUrl, "https://cdn.exemplo.com/c.png");
  assert.equal(c.imageUrl, null);
});
