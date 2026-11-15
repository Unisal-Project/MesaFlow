import assert from "node:assert/strict";
import { test } from "node:test";

const { moveStock } = await import("../src/modules/orders/stock.js");

/** Tabela products mínima que respeita o UPDATE condicional do moveStock. */
function fakeTx(product: {
  name: string;
  stockQuantity: number;
  trackStock: boolean;
}) {
  const movements: unknown[] = [];
  const tx: any = {
    product: {
      updateMany: async ({ where, data }: any) => {
        const min = where.stockQuantity?.gte;
        if (
          where.trackStock !== product.trackStock ||
          (min !== undefined && product.stockQuantity < min)
        )
          return { count: 0 };
        product.stockQuantity += data.stockQuantity.increment;
        return { count: 1 };
      },
      findUnique: async () => product,
    },
    stockMovement: { create: async ({ data }: any) => movements.push(data) },
  };
  return { tx, movements, product };
}

const sale = { type: "SALE" as const, orderId: 1n, userId: null };

test("moveStock debita produto controlado e registra movimento", async () => {
  const { tx, movements, product } = fakeTx({
    name: "Suco",
    stockQuantity: 3,
    trackStock: true,
  });
  await moveStock(tx, 4n, -2, sale);
  assert.equal(product.stockQuantity, 1);
  assert.equal(movements.length, 1);
  await assert.rejects(
    moveStock(tx, 4n, -2, sale),
    /Estoque insuficiente para Suco \(disponível: 1\)/,
  );
});

test("moveStock ignora produto sem controle de estoque", async () => {
  const { tx, movements, product } = fakeTx({
    name: "Água",
    stockQuantity: 0,
    trackStock: false,
  });
  await moveStock(tx, 4n, -50, sale);
  await moveStock(tx, 4n, 50, { ...sale, type: "CANCELLATION" });
  assert.equal(product.stockQuantity, 0);
  assert.equal(movements.length, 0);
});
