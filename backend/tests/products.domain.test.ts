import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "../src/generated/prisma/client.js";
import { PrismaProductRepository } from "../src/modules/products/repositories/prisma-products.repository.js";
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
