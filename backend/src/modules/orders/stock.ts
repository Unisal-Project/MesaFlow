import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/errors/app-errors.js";

export type StockMovementInput = {
  type: "SALE" | "ADJUSTMENT" | "CANCELLATION";
  orderId: bigint;
  orderItemId?: bigint;
  userId: bigint | null;
};

/**
 * Soma `change` ao estoque e registra o stock_movement (regras 10 e 11).
 * O débito usa uma condição no próprio UPDATE: só desconta se houver saldo,
 * então pedidos simultâneos nunca deixam o estoque negativo.
 */
export async function moveStock(
  tx: Prisma.TransactionClient,
  productId: bigint,
  change: number,
  movement: StockMovementInput,
) {
  const updated = await tx.product.updateMany({
    where: {
      id: productId,
      ...(change < 0 ? { stockQuantity: { gte: -change } } : {}),
    },
    data: { stockQuantity: { increment: change } },
  });
  if (updated.count !== 1) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, stockQuantity: true },
    });
    throw new AppError(
      product
        ? `Estoque insuficiente para ${product.name} (disponível: ${product.stockQuantity})`
        : "Produto não encontrado",
      409,
    );
  }
  await tx.stockMovement.create({
    data: {
      productId,
      quantity: change,
      type: movement.type,
      orderId: movement.orderId,
      orderItemId: movement.orderItemId ?? null,
      userId: movement.userId,
    },
  });
}

/**
 * Ordena por productId crescente. Toda transação que mexe em estoque deve
 * atualizar os produtos nessa ordem para que pedidos simultâneos travem as
 * linhas na mesma sequência e não entrem em deadlock.
 */
export const byProductId = (
  a: { productId: bigint },
  b: { productId: bigint },
) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0);
