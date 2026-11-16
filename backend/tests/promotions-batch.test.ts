import assert from "node:assert/strict";
import { idFor } from "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/promotions_test";
process.env.JWT_SECRET ??= "promotions-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

const { PrismaProductRepository } =
  await import("../src/modules/products/repositories/prisma-products.repository.js");
const { default: ProductService } =
  await import("../src/modules/products/products.service.js");
const { default: ProductsController } =
  await import("../src/modules/products/products.controller.js");
const { requireApiAuthentication } =
  await import("../src/shared/api-access.js");
const { errorHandler } = await import("../src/shared/errors/error-handler.js");

/** Banco em memória: products/categories com transação tudo-ou-nada. */
function fakeDb() {
  const products = [
    { id: 1n, name: "Suco", price: "8.00", promoActive: false },
    { id: 2n, name: "Burger", price: "30.00", promoActive: false },
  ] as any[];
  const categories = [{ id: 5n, name: "Bebidas", promoActive: false }] as any[];
  const table = (rows: any[]) => ({
    findMany: async ({ where }: any) =>
      rows.filter((row) => where.id.in.includes(row.id)),
    updateMany: async ({ where, data }: any) => {
      const hit = rows.filter((row) => where.id.in.includes(row.id));
      hit.forEach((row) => Object.assign(row, data));
      return { count: hit.length };
    },
  });
  const client: any = {
    product: table(products),
    category: table(categories),
    $transaction: async (callback: (tx: any) => unknown) => {
      const snapshot = structuredClone({ products, categories });
      try {
        return await callback(client);
      } catch (error) {
        products.splice(0, Infinity, ...snapshot.products);
        categories.splice(0, Infinity, ...snapshot.categories);
        throw error;
      }
    },
  };
  return { client, products, categories };
}

async function makeApp() {
  const db = fakeDb();
  const controller = new ProductsController(
    new ProductService(new PrismaProductRepository(db.client), {} as never),
  );
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(fastifyJwt, { secret: "test-secret" });
  app.addHook("onRequest", requireApiAuthentication);
  app.patch("/promotions", (request, reply) =>
    controller.applyPromotions(request, reply),
  );
  const as = (role: "ADMIN" | "EMPLOYEE") =>
    `Bearer ${app.jwt.sign({ id: idFor(role), email: "a@x.com", role })}`;
  const patch = (payload: object, role: "ADMIN" | "EMPLOYEE" = "ADMIN") =>
    app.inject({
      method: "PATCH",
      url: "/promotions",
      headers: { authorization: as(role) },
      payload,
    });
  return { app, db, patch };
}

const percent = {
  promoType: "PERCENT",
  promoValue: 10,
  promoActive: true,
  promoStartsAt: null,
  promoEndsAt: null,
};

test("aplica a mesma promoção a produtos e categorias em lote", async () => {
  const { app, db, patch } = await makeApp();
  const response = await patch({
    productIds: ["1", "2"],
    categoryIds: ["5"],
    ...percent,
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { products: 2, categories: 1 });
  for (const row of [...db.products, ...db.categories])
    assert.deepEqual(
      [row.promoType, row.promoValue, row.promoActive],
      ["PERCENT", 10, true],
    );
  await app.close();
});

test("pausar em lote só desliga e preserva tipo, valor e datas", async () => {
  const { app, db, patch } = await makeApp();
  await patch({ productIds: ["1"], ...percent });
  const response = await patch({ productIds: ["1"], promoActive: false });
  assert.equal(response.statusCode, 200);
  assert.equal(db.products[0].promoActive, false);
  assert.equal(db.products[0].promoType, "PERCENT");
  assert.equal(db.products[0].promoValue, 10);
  await app.close();
});

test("R$ maior ou igual ao preço de algum produto → 400 com os nomes e nada é gravado", async () => {
  const { app, db, patch } = await makeApp();
  const response = await patch({
    productIds: ["1", "2"],
    categoryIds: ["5"],
    ...percent,
    promoType: "AMOUNT",
    promoValue: 8,
  });
  assert.equal(response.statusCode, 400);
  assert.match(response.json().message, /Suco/);
  assert.doesNotMatch(response.json().message, /Burger/);
  assert.ok(
    [...db.products, ...db.categories].every((row) => !row.promoActive),
  );
  await app.close();
});

test("id inexistente, lista vazia, % inválido e EMPLOYEE são recusados", async () => {
  const { app, db, patch } = await makeApp();
  const missing = await patch({ productIds: ["1", "99"], ...percent });
  assert.equal(missing.statusCode, 404);
  assert.equal(db.products[0].promoActive, false, "rollback");
  assert.equal((await patch({ ...percent })).statusCode, 400);
  assert.equal(
    (await patch({ productIds: ["1"], ...percent, promoValue: 95 })).statusCode,
    400,
  );
  assert.equal(
    (await patch({ productIds: ["1"], promoActive: true })).statusCode,
    400,
  );
  assert.equal(
    (await patch({ productIds: ["1"], ...percent }, "EMPLOYEE")).statusCode,
    403,
  );
  await app.close();
});
