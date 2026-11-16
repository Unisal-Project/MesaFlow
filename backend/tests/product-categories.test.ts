import assert from "node:assert/strict";
import { idFor } from "./helpers/session.js";
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

function setup(existingIds = [1n, 2n, 3n], orphan = false) {
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
      findUnique: async () =>
        orphan ? { ...stored, categoryId: null, active: false } : stored,
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
  return { repository: new PrismaProductRepository(prisma), calls, tx };
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

test("deleted products stay out of the catalog after a new query", async () => {
  let product = { ...stored, active: true };
  const client = {
    product: {
      update: async ({ data }: any) => {
        product = { ...product, ...data };
        return product;
      },
      findMany: async ({ where }: any) =>
        where?.active === true && !product.active ? [] : [product],
    },
  } as unknown as typeof PrismaConnector;
  const repository = new PrismaProductRepository(client);
  assert.equal((await repository.getAllProducts()).length, 1);
  await repository.deactivateProduct(10n);
  assert.deepEqual(await repository.getAllProducts(), []);
});

test("featured defaults false on create, accepts booleans and stays absent in unrelated PATCH", () => {
  assert.equal(ProductSchema.parse(input).featured, false);
  for (const featured of [true, false]) {
    assert.equal(
      ProductSchema.parse({ ...input, featured }).featured,
      featured,
    );
    assert.equal(ProductUpdateSchema.parse({ featured }).featured, featured);
  }
  assert.equal(
    "featured" in ProductUpdateSchema.parse({ name: "Novo" }),
    false,
  );
  for (const featured of ["true", 1, null]) {
    assert.equal(
      ProductSchema.safeParse({ ...input, featured }).success,
      false,
    );
    assert.equal(ProductUpdateSchema.safeParse({ featured }).success, false);
  }
});

test("ADMIN creates and toggles featured through existing routes; EMPLOYEE is refused", async () => {
  const { default: jwt } = await import("@fastify/jwt");
  const { requireApiAuthentication } =
    await import("../src/shared/api-access.js");
  const { repository, calls } = setup();
  const controller = new ProductsController(
    new ProductService(repository, {} as StorageService),
  );
  const app = Fastify();
  await app.register(jwt, { secret: "featured-test-secret" });
  await app.register(
    async (api) => {
      api.addHook("onRequest", requireApiAuthentication);
      api.post("/products", (request, reply) =>
        controller.createProduct(request, reply),
      );
      api.patch("/products/:id", (request, reply) =>
        controller.updateProduct(request, reply),
      );
    },
    { prefix: "/api/v1" },
  );
  await app.ready();
  const authorization = (role: "ADMIN" | "EMPLOYEE") =>
    `Bearer ${app.jwt.sign({ id: idFor(role), email: "test@example.com", role })}`;
  try {
    for (const featured of [undefined, true]) {
      const created = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: authorization("ADMIN") },
        payload: { ...input, ...(featured !== undefined && { featured }) },
      });
      assert.equal(created.statusCode, 201);
      assert.equal(created.json().featured, featured ?? false);
    }
    for (const featured of [true, false]) {
      const updated = await app.inject({
        method: "PATCH",
        url: "/api/v1/products/10",
        headers: { authorization: authorization("ADMIN") },
        payload: { featured },
      });
      assert.equal(updated.statusCode, 200);
      assert.equal(updated.json().featured, featured);
      assert.equal(
        calls.filter((call) => call.operation === "update").at(-1)?.args.data
          .featured,
        featured,
      );
    }
    await repository.updateProduct(10n, { name: "Novo" });
    assert.equal(
      "featured" in
        calls.filter((call) => call.operation === "update").at(-1)?.args.data,
      false,
    );
    const count = calls.length;
    for (const method of ["POST", "PATCH"] as const) {
      const denied = await app.inject({
        method,
        url: method === "POST" ? "/api/v1/products" : "/api/v1/products/10",
        headers: { authorization: authorization("EMPLOYEE") },
        payload:
          method === "POST" ? { ...input, featured: true } : { featured: true },
      });
      assert.equal(denied.statusCode, 403);
    }
    assert.equal(calls.length, count);
  } finally {
    await app.close();
  }
});

test("produto sem categoria não pode ser criado, editado nem reativado", async () => {
  assert.equal(
    ProductSchema.safeParse({ name: "Sem categoria", price: 10 }).success,
    false,
  );
  assert.equal(
    ProductUpdateSchema.safeParse({ categoryId: null }).success,
    false,
  );
  const { repository, calls } = setup(undefined, true);
  for (const patch of [{ active: true }, { name: "Novo nome" }]) {
    await assert.rejects(repository.updateProduct(10n, patch), {
      statusCode: 400,
    });
  }
  assert.equal(
    calls.some((call) => call.operation === "update"),
    false,
  );
  const fixed = await repository.updateProduct(10n, {
    active: true,
    categoryId: 1n,
  });
  assert.equal(fixed.categoryId, 1n);
});

test("HTTP: órfão não pode ser criado/editado/reativado nem exposto ao público", async () => {
  const { repository } = setup(undefined, true);
  const { errorHandler } =
    await import("../src/shared/errors/error-handler.js");
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  const controller = new ProductsController(
    new ProductService(repository, {} as StorageService),
  );
  app.post("/products", (request, reply) =>
    controller.createProduct(request, reply),
  );
  app.patch("/products/:id", (request, reply) =>
    controller.updateProduct(request, reply),
  );
  app.get("/products/:id", (request, reply) =>
    controller.getProductById(request, reply),
  );
  try {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/products",
          payload: { name: "Orfão", price: 10 },
        })
      ).statusCode,
      400,
    );
    for (const payload of [
      { name: "Editado" },
      { active: true },
      { categoryId: null },
    ]) {
      assert.equal(
        (await app.inject({ method: "PATCH", url: "/products/10", payload }))
          .statusCode,
        400,
      );
    }
    const inactive = await app.inject("/products/10");
    assert.equal(inactive.statusCode, 404);
    assert.equal((await repository.getProductById(10n))?.categoryId, null);
  } finally {
    await app.close();
  }
});

test("ajuste de estoque usa delta do saldo sob lock e audita; sem controle ignora", async () => {
  const { repository, tx, calls } = setup();
  const movements: any[] = [];
  const row = { ...stored, stockQuantity: 8, trackStock: true };
  tx.product.findUnique = async () => row;
  (tx.product as any).updateMany = async ({ data }: any) => {
    row.stockQuantity += data.stockQuantity.increment;
    return { count: 1 };
  };
  (tx as any).stockMovement = {
    create: async ({ data }: any) => movements.push(data),
  };
  await repository.updateProduct(10n, { stockQuantity: 10 });
  assert.equal(row.stockQuantity, 10);
  assert.equal(movements[0].quantity, 2);
  assert.equal(movements[0].type, "ADJUSTMENT");
  assert.equal(
    calls.filter((c) => c.operation === "update").at(-1)?.args.data
      .stockQuantity,
    undefined,
  );
  row.trackStock = false;
  await repository.updateProduct(10n, { stockQuantity: 50 });
  assert.equal(row.stockQuantity, 10);
  assert.equal(movements.length, 1);
});
