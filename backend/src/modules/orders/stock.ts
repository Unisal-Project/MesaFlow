import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../shared/errors/app-errors.js";

export type StockMovementInput = {
  type: "SALE" | "ADJUSTMENT" | "CANCELLATION";
  orderId?: bigint;
  orderItemId?: bigint;
  userId: bigint | null;
};

/**
 * Soma `change` ao estoque e registra o stock_movement (regras 10 e 11).
 * O débito usa uma condição no próprio UPDATE: só desconta se houver saldo,
 * então pedidos simultâneos nunca deixam o estoque negativo.
 * Produto com trackStock=false não tem saldo: nada é alterado nem registrado.
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
      trackStock: true,
      ...(change < 0 ? { stockQuantity: { gte: -change } } : {}),
    },
    data: { stockQuantity: { increment: change } },
  });
  if (updated.count !== 1) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, stockQuantity: true, trackStock: true },
    });
    if (product?.trackStock === false) return;
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
      orderId: movement.orderId ?? null,
      orderItemId: movement.orderItemId ?? null,
      userId: movement.userId,
    },
  });
}

/**
 * Movimenta o estoque dos itens de um pedido: UM movimento por produto (soma das
 * linhas; o carrinho cria 1 linha por unidade), em ordem de productId, com o 1º
 * item do produto como referência (orderItemId). `sign` -1 debita, 1 devolve.
 */
export async function moveItemsStock(
  tx: Prisma.TransactionClient,
  items: { id: bigint; productId: bigint; quantity: number }[],
  sign: 1 | -1,
  movement: Omit<StockMovementInput, "orderItemId">,
) {
  const byProduct = new Map<
    bigint,
    { orderItemId: bigint; quantity: number }
  >();
  for (const item of items) {
    const group = byProduct.get(item.productId);
    if (group) group.quantity += item.quantity;
    else
      byProduct.set(item.productId, {
        orderItemId: item.id,
        quantity: item.quantity,
      });
  }
  const groups = [...byProduct].map(([productId, group]) => ({
    productId,
    ...group,
  }));
  for (const { productId, orderItemId, quantity } of groups.sort(byProductId)) {
    await moveStock(tx, productId, sign * quantity, {
      ...movement,
      orderItemId,
    });
  }
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
