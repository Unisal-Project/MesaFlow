import assert from "node:assert/strict";
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
