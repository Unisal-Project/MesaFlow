import assert from "node:assert/strict";
import { idFor } from "./helpers/session.js";
import { test } from "node:test";
import Fastify from "fastify";

process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/categories_test";
process.env.JWT_SECRET ??= "categories-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";

test("lists categories at the categories collection route", async (t) => {
  const { PrismaCategoryRepository } =
    await import("../src/modules/categories/repository/prisma-category.repository.js");
  t.mock.method(PrismaCategoryRepository.prototype, "findAll", async () => []);

  const { registerCategoryRoutes } =
    await import("../src/modules/categories/category.routes.js");
  const app = Fastify();
  await app.register(registerCategoryRoutes, { prefix: "/api/v1" });

  try {
    const response = await app.inject("/api/v1/categories");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), []);
  } finally {
    await app.close();
  }
});

/** Banco em memória com só o que a exclusão de categoria usa. */
function fakeCatalog() {
  const categories = [1n, 2n, 3n];
  const products: { id: bigint; categoryId: bigint | null; active: boolean }[] =
    [
      { id: 10n, categoryId: 1n, active: true },
      { id: 11n, categoryId: 1n, active: false },
      { id: 12n, categoryId: 3n, active: true },
    ];
  const orderItems = [{ productId: 10n, quantity: 2, unitPrice: "30.00" }];
  let links = [
    { productId: 10n, categoryId: 2n },
    { productId: 12n, categoryId: 1n },
  ];
  const categoryOf = (productId: bigint) =>
    products.find((p) => p.id === productId)!.categoryId;
  const client: any = {
    $transaction: async (callback: (tx: any) => unknown) => {
      const snapshot = structuredClone({ categories, products, links });
      try {
        return await callback(client);
      } catch (error) {
        categories.splice(0, Infinity, ...snapshot.categories);
        products.splice(0, Infinity, ...snapshot.products);
        links = snapshot.links;
        throw error;
      }
    },
    orderItem: {
      findMany: async () => orderItems,
      deleteMany: async () => {
        orderItems.length = 0;
      },
    },
    $queryRaw: async () => [],
    category: {
      findUnique: async ({ where }: any) =>
        categories.includes(where.id) ? { id: where.id } : null,
      delete: async ({ where }: any) => {
        if (
          products.some((p) => p.categoryId === where.id) ||
          links.some((l) => l.categoryId === where.id)
        )
          throw new Prisma.PrismaClientKnownRequestError("FK", {
            code: "P2003",
            clientVersion: "test",
          });
        categories.splice(categories.indexOf(where.id), 1);
      },
    },
    productCategory: {
      deleteMany: async ({ where }: any) => {
        links = links.filter(
          (l) =>
            l.categoryId !== where.categoryId ||
            (where.product !== undefined &&
              categoryOf(l.productId) !== where.product.categoryId),
        );
      },
    },
    product: {
      count: async ({ where }: any) =>
        products.filter(
          (p) => p.categoryId === where.categoryId && p.active === where.active,
        ).length,
      updateMany: async ({ where, data }: any) => {
        for (const p of products)
          if (
            p.categoryId === where.categoryId &&
            (where.active === undefined || p.active === where.active)
          )
            Object.assign(p, data);
      },
    },
  };
  return { client, categories, products, links: () => links };
}

const { Prisma } = await import("../src/generated/prisma/client.js");
const { PrismaCategoryRepository: CategoryRepo } =
  await import("../src/modules/categories/repository/prisma-category.repository.js");

test("excluir categoria com produtos sem moveTo devolve 409", async () => {
  const db = fakeCatalog();
  await assert.rejects(new CategoryRepo(db.client).delete(1n), {
    statusCode: 409,
  });
  assert.deepEqual(db.categories, [1n, 2n, 3n]);
});

test("excluir com moveTo move ativos e inativos e limpa ligações adicionais", async () => {
  const db = fakeCatalog();
  await new CategoryRepo(db.client).delete(1n, 2n);
  assert.deepEqual(db.categories, [2n, 3n]);
  assert.deepEqual(
    db.products.map((p) => p.categoryId),
    [2n, 2n, 3n],
  );
  // 10 tinha 2 como adicional (agora é principal) e 12 tinha a excluída.
  assert.deepEqual(db.links(), []);
});

test("moveTo igual ou inexistente é recusado sem alterar nada", async () => {
  const db = fakeCatalog();
  const repo = new CategoryRepo(db.client);
  await assert.rejects(repo.delete(1n, 1n), { statusCode: 400 });
  await assert.rejects(repo.delete(1n, 99n), { statusCode: 404 });
  assert.deepEqual(db.categories, [1n, 2n, 3n]);
  assert.equal(db.links().length, 2);
});

test("DELETE /categories/:id valida moveTo na query", async (t) => {
  const calls: unknown[] = [];
  t.mock.method(
    CategoryRepo.prototype,
    "delete",
    async (...args: unknown[]) => {
      calls.push(args);
    },
  );
  const { registerCategoryRoutes } =
    await import("../src/modules/categories/category.routes.js");
  const { errorHandler } =
    await import("../src/shared/errors/error-handler.js");
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(registerCategoryRoutes, { prefix: "/api/v1" });
  try {
    const bad = await app.inject({
      method: "DELETE",
      url: "/api/v1/categories/1?moveTo=abc",
    });
    assert.equal(bad.statusCode, 400);
    const ok = await app.inject({
      method: "DELETE",
      url: "/api/v1/categories/1?moveTo=2",
    });
    assert.equal(ok.statusCode, 204);
    assert.deepEqual(calls, [[1n, 2n, false]]);
  } finally {
    await app.close();
  }
});

test("só inativos exclui sem destino e preserva produtos históricos sem categoria", async () => {
  const db = fakeCatalog();
  db.products[0].active = false;
  await new CategoryRepo(db.client).delete(1n);
  assert.deepEqual(db.categories, [2n, 3n]);
  assert.deepEqual(
    db.products.map((product) => product.categoryId),
    [null, null, 3n],
  );
  assert.equal(db.products.length, 3);
  assert.deepEqual(db.links(), [{ productId: 10n, categoryId: 2n }]);
});

test("excluir com produtos só desativa os da categoria principal sem apagar histórico", async () => {
  const db = fakeCatalog();
  const orderItems = await db.client.orderItem.findMany();
  const before = structuredClone(orderItems);
  await new CategoryRepo(db.client).delete(1n, undefined, true);
  assert.deepEqual(db.categories, [2n, 3n]);
  assert.deepEqual(db.products, [
    { id: 10n, categoryId: null, active: false },
    { id: 11n, categoryId: null, active: false },
    { id: 12n, categoryId: 3n, active: true },
  ]);
  assert.deepEqual(db.links(), [{ productId: 10n, categoryId: 2n }]);
  assert.deepEqual(await db.client.orderItem.findMany(), before);
});

test("query deleteProducts é estrita, exclusiva com moveTo e DELETE continua ADMIN", async (t) => {
  const calls: unknown[] = [];
  t.mock.method(
    CategoryRepo.prototype,
    "delete",
    async (...args: unknown[]) => {
      calls.push(args);
    },
  );
  const { registerCategoryRoutes } =
    await import("../src/modules/categories/category.routes.js");
  const { errorHandler } =
    await import("../src/shared/errors/error-handler.js");
  const { requireApiAuthentication } =
    await import("../src/shared/api-access.js");
  const { default: jwt } = await import("@fastify/jwt");
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(jwt, { secret: "test-secret" });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      await api.register(registerCategoryRoutes);
    },
    { prefix: "/api/v1" },
  );
  const auth = (role: "ADMIN" | "EMPLOYEE") => ({
    authorization: `Bearer ${app.jwt.sign({ id: idFor(role), role, email: "a@x.com" })}`,
  });
  try {
    assert.equal(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/v1/categories/1?deleteProducts=true",
          headers: auth("EMPLOYEE"),
        })
      ).statusCode,
      403,
    );
    for (const query of [
      "deleteProducts=true&moveTo=2",
      "deleteProducts=false",
      "deleteProducts=1",
      "extra=1",
      "moveTo=0",
    ]) {
      assert.equal(
        (
          await app.inject({
            method: "DELETE",
            url: `/api/v1/categories/1?${query}`,
            headers: auth("ADMIN"),
          })
        ).statusCode,
        400,
      );
    }
    assert.equal(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/v1/categories/1?deleteProducts=true",
          headers: auth("ADMIN"),
        })
      ).statusCode,
      204,
    );
    assert.deepEqual(calls, [[1n, undefined, true]]);
  } finally {
    await app.close();
  }
});
