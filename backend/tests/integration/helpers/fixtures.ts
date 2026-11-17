import { randomInt, randomUUID } from "node:crypto";
import { db } from "./database.js";

export function createUser(role: "ADMIN" | "EMPLOYEE" = "ADMIN") {
  return db.user.create({
    data: {
      name: "Integration Test User",
      email: `test-${randomUUID()}@example.com`,
      passwordHash: "integration-test-only",
      role,
      active: true,
    },
  });
}

export function createTable() {
  return db.restaurantTable.create({
    data: {
      name: "Integration Test Table",
      number: randomInt(1_000_000_000, 4_000_000_000),
      qrToken: randomUUID(),
      seats: 4,
      active: true,
    },
  });
}

export function createCategory() {
  return db.category.create({
    data: {
      name: `Integration Test ${randomUUID()}`,
      active: true,
    },
  });
}

export function createProduct(categoryId: bigint) {
  return db.product.create({
    data: {
      name: "Integration Test Product",
      categoryId,
      price: 10,
      stockQuantity: 100,
      trackStock: true,
      active: true,
      available: true,
    },
  });
}
