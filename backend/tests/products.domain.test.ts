import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "../src/generated/prisma/client.js";
process.env.DATABASE_URL ??= "mysql://test:test@127.0.0.1:1/products_test";
process.env.JWT_SECRET ??= "products-test-secret";
process.env.FRONTEND_URL ??= "https://menu.example";
const { PrismaProductRepository } =
  await import("../src/modules/products/repositories/prisma-products.repository.js");
import type { PrismaConnector } from "../src/database/prisma.js";

test("Prisma repository returns a storage-independent product price", async () => {
  const stored = {
    id: 1n,
    categoryId: 2n,
    name: "Coffee",
    description: null,
    imageUrl: null,
    price: new Prisma.Decimal("12.30"),
    stockQuantity: 1,
    available: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    product: {
      findUnique: async () => stored,
    },
  } as unknown as typeof PrismaConnector;

  const product = await new PrismaProductRepository(prisma).getProductById(1n);
  assert.equal(product?.price, "12.3");
});
