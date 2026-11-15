import assert from "node:assert/strict";
import { test } from "node:test";

const { pricing, effectivePrice, promoIssue } =
  await import("../src/modules/products/promotion.js");

const now = new Date("2026-11-14T12:00:00Z");
const off = {
  promoType: null,
  promoValue: null,
  promoActive: false,
  promoStartsAt: null,
  promoEndsAt: null,
};
const promo = (promoType: "PERCENT" | "AMOUNT", promoValue: string) => ({
  ...off,
  promoType,
  promoValue,
  promoActive: true,
});

test("PERCENT arredonda em centavos e AMOUNT subtrai", () => {
  assert.equal(
    effectivePrice({ price: "10.00", ...promo("PERCENT", "20") }, now),
    "8.00",
  );
  assert.equal(
    effectivePrice({ price: "9.99", ...promo("PERCENT", "15") }, now),
    "8.49",
  );
  assert.equal(
    effectivePrice({ price: "12.00", ...promo("AMOUNT", "5") }, now),
    "7.00",
  );
  // Produto com R$ >= preço é barrado na validação; o helper garante 0,01.
  assert.equal(
    effectivePrice({ price: "3.00", ...promo("AMOUNT", "5") }, now),
    "0.01",
  );
});

test("produto ligado vence categoria; desligado herda; nada ligado = price", () => {
  const category = promo("PERCENT", "50");
  assert.deepEqual(
    pricing({ price: "10.00", ...promo("AMOUNT", "1"), category }, now),
    {
      finalPrice: "9.00",
      promotion: { type: "AMOUNT", value: "1", source: "PRODUCT" },
    },
  );
  assert.deepEqual(pricing({ price: "10.00", ...off, category }, now), {
    finalPrice: "5.00",
    promotion: { type: "PERCENT", value: "50", source: "CATEGORY" },
  });
  assert.deepEqual(
    pricing(
      { price: "10.00", ...off, category: { ...category, promoActive: false } },
      now,
    ),
    { finalPrice: "10.00", promotion: null },
  );
  // category ausente (mocks antigos) não quebra.
  assert.equal(effectivePrice({ price: "10.00", ...off }, now), "10.00");
});

test("categoria em R$ maior ou igual ao preço é ignorada no produto", () => {
  const category = promo("AMOUNT", "10");
  assert.equal(
    effectivePrice({ price: "10.00", ...off, category }, now),
    "10.00",
  );
  assert.equal(
    effectivePrice({ price: "15.00", ...off, category }, now),
    "5.00",
  );
});

test("vigência: início futuro ou fim passado não aplicam", () => {
  const base = { price: "10.00", ...promo("PERCENT", "10") };
  const at = (iso: string) => new Date(iso);
  assert.equal(
    effectivePrice({ ...base, promoStartsAt: at("2026-11-15T00:00:00Z") }, now),
    "10.00",
  );
  assert.equal(
    effectivePrice({ ...base, promoEndsAt: at("2026-11-14T12:00:00Z") }, now),
    "10.00",
  );
  assert.equal(
    effectivePrice(
      {
        ...base,
        promoStartsAt: at("2026-11-01T00:00:00Z"),
        promoEndsAt: at("2026-11-30T00:00:00Z"),
      },
      now,
    ),
    "9.00",
  );
});

test("promoIssue valida percentual, ativação, datas e R$ do produto", () => {
  assert.match(promoIssue({ promoType: "PERCENT", promoValue: 91 })!, /1 a 90/);
  assert.match(
    promoIssue({ promoType: "PERCENT", promoValue: 12.5 })!,
    /1 a 90/,
  );
  assert.match(
    promoIssue({ promoActive: true, promoType: null })!,
    /tipo e valor/,
  );
  assert.match(
    promoIssue({
      promoStartsAt: new Date("2026-11-02"),
      promoEndsAt: new Date("2026-11-01"),
    })!,
    /depois do início/,
  );
  assert.match(
    promoIssue({ promoType: "AMOUNT", promoValue: 10 }, 10)!,
    /menor que o preço/,
  );
  assert.equal(
    promoIssue({ promoType: "PERCENT", promoValue: 90, promoActive: true }),
    null,
  );
});

test("POST /orders: findAvailableByIds devolve o preço com promoção da categoria", async () => {
  const { PrismaProductRepository } =
    await import("../src/modules/products/repositories/prisma-products.repository.js");
  const client: any = {
    product: {
      findMany: async ({ select }: any) => {
        assert.ok(select.category, "seleciona a promoção da categoria");
        return [
          {
            id: 1n,
            price: "20.00",
            ...off,
            category: promo("PERCENT", "25"),
          },
        ];
      },
    },
  };
  assert.deepEqual(
    await new PrismaProductRepository(client).findAvailableByIds([1n]),
    [{ id: 1n, price: "15.00" }],
  );
});

test("DTOs recusam promoção inválida e PUT de categoria aceita sem promoção", async () => {
  const { ProductSchema, ProductUpdateSchema } =
    await import("../src/modules/products/dto/products.dto.js");
  const { updateCategorySchema } =
    await import("../src/modules/categories/dto/update-category.dto.js");
  const base = { name: "Suco", price: 10, categoryId: "1" };
  for (const promoValue of [0, 91, 12.5])
    assert.equal(
      ProductSchema.safeParse({ ...base, promoType: "PERCENT", promoValue })
        .success,
      false,
    );
  assert.equal(
    ProductSchema.safeParse({ ...base, promoType: "AMOUNT", promoValue: 10 })
      .success,
    false,
  );
  assert.equal(
    ProductUpdateSchema.safeParse({ promoActive: true }).success,
    false,
  );
  assert.equal(
    ProductUpdateSchema.safeParse({
      promoStartsAt: "2026-11-20T10:00:00Z",
      promoEndsAt: "2026-11-19T10:00:00Z",
    }).success,
    false,
  );
  const parsed = updateCategorySchema.parse({ name: "Bebidas", active: true });
  assert.equal("promoActive" in parsed, false);
});
