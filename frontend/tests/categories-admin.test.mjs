import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, useCategories, createHookRunner;
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
        name: "controlled-category-hook-renders",
        enforce: "pre",
        transform(code, id) {
          if (id.endsWith("/Categories/hooks/useCategories.ts"))
            return code.replace(
              'from "react"',
              'from "/tests/helpers/hook-runtime.mjs"',
            );
        },
      },
    ],
  });
  ({ useCategories } = await server.ssrLoadModule(
    "/src/pages/admin/Categories/hooks/useCategories.ts",
  ));
  ({ createHookRunner } = await server.ssrLoadModule(
    "/tests/helpers/hook-runtime.mjs",
  ));
});
after(async () => {
  await server?.close();
  Object.assign(globalThis, previous);
});

test("excluir categoria move só quem difere do destino padrão e manda moveTo", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const { pathname, search } = new URL(url);
    const path = pathname.replace("/api/v1", "") + search;
    calls.push(`${options.method ?? "GET"} ${path}`);
    if (options.method === "PATCH")
      calls.push(options.body);
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    if (options.method) return Response.json({ id: "10", imageUrl: null });
    return Response.json([
      { id: "1", name: "Lanches", description: null, active: true },
      { id: "2", name: "Bebidas", description: null, active: true },
      { id: "3", name: "Doces", description: null, active: true },
    ]);
  };
  const render = createHookRunner(() => useCategories());
  let hook = render();
  await hook.reload();
  hook = render();
  hook.requestCategoryDeletion(hook.categories[0]);
  hook = render();
  await hook.confirmCategoryDeletion("2", [
    { product: { id: "10", additionalCategoryIds: ["1", "3"] }, categoryId: "3" },
    { product: { id: "11", additionalCategoryIds: [] }, categoryId: "2" },
  ]);
  hook = render();
  assert.deepEqual(calls.slice(1), [
    "PATCH /products/10",
    JSON.stringify({ categoryId: "3", additionalCategoryIds: [] }),
    "DELETE /categories/1?moveTo=2",
  ]);
  assert.deepEqual(
    hook.categories.map((category) => category.id),
    ["2", "3"],
  );
  assert.equal(hook.categoryToDelete, null);
});
