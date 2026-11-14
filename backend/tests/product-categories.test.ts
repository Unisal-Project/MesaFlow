import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "../src/generated/prisma/client.js";
import type { PrismaConnector } from "../src/database/prisma.js";
import {
  ProductSchema,
  ProductUpdateSchema,
} from "../src/modules/products/dto/products.dto.js";
process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/products_test";
process.env.JWT_SECRET ??= "products-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { PrismaProductRepository } =
  await import("../src/modules/products/repositories/prisma-products.repository.js");
import ProductService from "../src/modules/products/products.service.js";
import ProductsController from "../src/modules/products/products.controller.js";
import type { StorageService } from "../src/shared/storage/storage.service.js";
import Fastify from "fastify";

const input = { name: "Salpi Bacon", price: 25, categoryId: "1" };
const stored = {
  id: 10n,
  categoryId: 1n,
  name: input.name,
  price: new Prisma.Decimal(25),
  description: null,
  imageUrl: null,
  stockQuantity: 0,
  available: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  additionalCategories: [{ categoryId: 2n }],
};

function setup(existingIds = [1n, 2n, 3n]) {
  const calls: { operation: string; args?: any }[] = [];
  const tx = {
    $queryRaw: async () => {
      calls.push({ operation: "lock" });
      return [{ id: 10n }];
    },
    category: {
      count: async ({ where }: any) =>
        where.id.in.filter((id: bigint) => existingIds.includes(id)).length,
    },
    product: {
      findUnique: async () => stored,
      findMany: async () => [stored],
      create: async (args: any) => {
        calls.push({ operation: "create", args });
        return {
          ...stored,
          ...args.data,
          additionalCategories: args.data.additionalCategories.create,
        };
      },
      update: async (args: any) => {
        calls.push({ operation: "update", args });
        return {
          ...stored,
          ...args.data,
          additionalCategories:
            args.data.additionalCategories?.create ??
            stored.additionalCategories,
        };
      },
    },
  };
  const prisma = {
    ...tx,
    $transaction: async (callback: any) => {
      calls.push({ operation: "transaction" });
      return callback(tx);
    },
  } as unknown as typeof PrismaConnector;
  return { repository: new PrismaProductRepository(prisma), calls };
}

test("DTOs accept legacy inputs and distinguish omitted associations from []", () => {
  assert.equal(ProductSchema.parse(input).additionalCategoryIds, undefined);
  assert.deepEqual(
    ProductSchema.parse({ ...input, additionalCategoryIds: ["2", 3] })
      .additionalCategoryIds,
    [2n, 3n],
  );
  assert.equal(
    ProductUpdateSchema.parse({ name: "Novo" }).additionalCategoryIds,
    undefined,
  );
  assert.deepEqual(
    ProductUpdateSchema.parse({ additionalCategoryIds: [] })
      .additionalCategoryIds,
    [],
  );
  for (const additionalCategoryIds of [["2", 2], ["1"], ["0"], ["invalid"]]) {
    assert.equal(
      ProductSchema.safeParse({ ...input, additionalCategoryIds }).success,
      false,
    );
  }
  assert.equal(
    ProductUpdateSchema.safeParse({
      categoryId: "2",
      additionalCategoryIds: ["2"],
    }).success,
    false,
  );
});

test("creation saves one product and associations inside a transaction", async () => {
  const { repository, calls } = setup();
  const result = await repository.createProduct({
    ...ProductSchema.parse(input),
    additionalCategoryIds: [2n, 3n],
  });
  assert.deepEqual(result.additionalCategoryIds, [2n, 3n]);
  assert.deepEqual(
    calls.map((call) => call.operation),
    ["transaction", "create"],
  );
  assert.deepEqual(calls[1].args.data.additionalCategories.create, [
    { categoryId: 2n },
    { categoryId: 3n },
  ]);
  assert.equal(calls[1].args.data.additionalCategoryIds, undefined);
});

test("update preserves omitted associations and replaces or clears explicit associations", async () => {
  const { repository, calls } = setup();
  const preserved = await repository.updateProduct(10n, { name: "Novo" });
  assert.deepEqual(preserved.additionalCategoryIds, [2n]);
  assert.equal(
    calls.find((call) => call.operation === "update")?.args.data
      .additionalCategories,
    undefined,
  );
  calls.length = 0;
  const cleared = await repository.updateProduct(10n, {
    additionalCategoryIds: [],
  });
  assert.deepEqual(cleared.additionalCategoryIds, []);
  assert.deepEqual(
    calls.map((call) => call.operation),
    ["transaction", "lock", "update"],
  );
  assert.deepEqual(calls[2].args.data.additionalCategories, {
    deleteMany: {},
    create: [],
  });
  const changed = await repository.updateProduct(10n, {
    categoryId: 2n,
    additionalCategoryIds: [1n, 3n],
  });
  assert.equal(changed.categoryId, 2n);
  assert.deepEqual(changed.additionalCategoryIds, [1n, 3n]);
});

test("invalid IDs, duplicates and principal/additional collisions do not write", async () => {
  for (const additionalCategoryIds of [[2n, 2n], [1n], [99n]]) {
    const { repository, calls } = setup();
    await assert.rejects(
      repository.createProduct({
        ...ProductSchema.parse(input),
        additionalCategoryIds,
      }),
    );
    await assert.rejects(
      repository.updateProduct(10n, { additionalCategoryIds }),
    );
    assert.equal(
      calls.some((call) => ["create", "update"].includes(call.operation)),
      false,
    );
  }
  const { repository, calls } = setup();
  await assert.rejects(repository.switchCategory(10n, 2n), /principal/);
  await assert.rejects(
    repository.switchCategory(10n, 99n),
    /Categoria não encontrada/,
  );
  assert.equal(
    calls.some((call) => call.operation === "update"),
    false,
  );
});

test("controller serializes category IDs as strings and rejects invalid selections", async () => {
  const { repository } = setup();
  const controller = new ProductsController(
    new ProductService(repository, {} as StorageService),
  );
  const app = Fastify();
  app.post("/products", (request, reply) =>
    controller.createProduct(request, reply),
  );
  app.patch("/products/:id", (request, reply) =>
    controller.updateProduct(request, reply),
  );
  try {
    const created = await app.inject({
      method: "POST",
      url: "/products",
      payload: { ...input, additionalCategoryIds: ["2"] },
    });
    assert.equal(created.statusCode, 201);
    assert.deepEqual(created.json().additionalCategoryIds, ["2"]);
    assert.equal(created.json().categoryId, "1");
    const cleared = await app.inject({
      method: "PATCH",
      url: "/products/10",
      payload: { additionalCategoryIds: [] },
    });
    assert.equal(cleared.statusCode, 200);
    assert.deepEqual(cleared.json().additionalCategoryIds, []);
    const invalid = await app.inject({
      method: "POST",
      url: "/products",
      payload: { ...input, additionalCategoryIds: ["1"] },
    });
    assert.equal(invalid.statusCode, 400);
  } finally {
    await app.close();
  }
});

test("queries include additional categories without duplicating products", async () => {
  const { repository } = setup();
  const product = await repository.getProductById(10n);
  assert.deepEqual(product?.additionalCategoryIds, [2n]);
  const products = await repository.getAllProducts();
  assert.equal(products.length, 1);
  assert.deepEqual(products[0]?.additionalCategoryIds, [2n]);
});

test("missing principal categories are rejected before saving", async () => {
  const { repository, calls } = setup();
  await assert.rejects(
    repository.createProduct({
      ...ProductSchema.parse(input),
      categoryId: 99n,
    }),
    /Categoria não encontrada/,
  );
  assert.equal(
    calls.some((call) => call.operation === "create"),
    false,
  );
});
