import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const repositoryPath = new URL(
  "../src/modules/products/repositories/products.repository.ts",
  import.meta.url,
);
const prismaRepositoryPath = new URL(
  "../src/modules/products/repositories/prisma-products.repository.ts",
  import.meta.url,
);

test("products repository uses an interface contract", async () => {
  const [repository, prismaRepository] = await Promise.all([
    readFile(repositoryPath, "utf8"),
    readFile(prismaRepositoryPath, "utf8"),
  ]);

  assert.match(repository, /export default interface ProductsRepository/);
  assert.match(
    prismaRepository,
    /class PrismaProductRepository implements ProductsRepository/,
  );
  assert.doesNotMatch(prismaRepository, /extends ProductsRepository/);
});
