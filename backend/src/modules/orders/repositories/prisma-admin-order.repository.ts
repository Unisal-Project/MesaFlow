import { PrismaConnector } from "../../../database/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import { moveStock } from "../stock.js";

type Tx = Prisma.TransactionClient;

export type ActorRole = "ADMIN" | "EMPLOYEE";

export interface Actor {
  id: bigint | null;
  role: ActorRole;
}

export interface AdminOrderItemInput {
  productId: bigint;
  quantity: number;
  notes?: string;
}

const ACTIVE_ATTENDANCE = [
  "OPEN",
  "CLOSING_REQUESTED",
  "AWAITING_PAYMENT",
] as const;

export const adminOrderInclude = {
  items: {
    orderBy: { id: "asc" },
    include: { product: { select: { name: true } } },
  },
  attendance: {
    include: {
      table: { select: { id: true, number: true, name: true } },
      payments: { where: { status: "PAID" }, orderBy: { id: "asc" } },
    },
  },
} satisfies Prisma.OrderInclude;

export type AdminOrderRecord = Prisma.OrderGetPayload<{
  include: typeof adminOrderInclude;
}>;

/**
 * Pedidos lançados pelo administrativo. Cada escrita roda em transação e
 * mantém o estoque e os stock_movements alinhados (regras 9 a 17).
 */
export class PrismaAdminOrderRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  findSince(since: Date): Promise<AdminOrderRecord[]> {
    return this.prismaClient.order.findMany({
      where: { createdAt: { gte: since } },
      include: adminOrderInclude,
      orderBy: { id: "desc" },
    });
  }

  createForTable(
    tableId: bigint,
    items: AdminOrderItemInput[],
    notes: string | null | undefined,
    actor: Actor,
  ): Promise<AdminOrderRecord> {
    return this.prismaClient.$transaction(async (tx) => {
      // Bloqueia a mesa: dois pedidos simultâneos não abrem dois atendimentos.
      await tx.$queryRaw`SELECT id FROM restaurant_tables WHERE id = ${tableId} FOR UPDATE`;
      const table = await tx.restaurantTable.findUnique({
        where: { id: tableId },
        select: { active: true },
      });
      if (!table) throw new AppError("Mesa não encontrada", 404);

      const current = await tx.attendance.findFirst({
        where: { tableId, status: { in: [...ACTIVE_ATTENDANCE] } },
        select: { id: true, status: true },
      });
      if (current && current.status !== "OPEN") {
        throw new AppError(
          "A conta desta mesa já foi solicitada; não aceita novos pedidos",
          409,
        );
      }
      if (!current && !table.active) {
        throw new AppError("Mesa inativa não pode iniciar atendimento", 409);
      }
      const attendanceId =
        current?.id ??
        (await tx.attendance.create({ data: { tableId, status: "OPEN" } })).id;

      const prices = await this.lockProducts(
        tx,
        items.map((item) => item.productId),
      );
      const order = await tx.order.create({
        data: {
          attendanceId,
          notes: notes || null,
          createdById: actor.id,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: prices.get(item.productId)!,
              notes: item.notes || null,
            })),
          },
        },
        include: { items: true },
      });
      for (const item of order.items) {
        await moveStock(tx, item.productId, -item.quantity, {
          type: "SALE",
          orderId: order.id,
          orderItemId: item.id,
          userId: actor.id,
        });
      }
      await tx.printJob.create({ data: { orderId: order.id, type: "ORDER" } });
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: adminOrderInclude,
      });
    });
  }

  replaceItems(
    orderId: bigint,
    items: AdminOrderItemInput[],
    notes: string | null | undefined,
    actor: Actor,
  ): Promise<AdminOrderRecord> {
    return this.prismaClient.$transaction(async (tx) => {
      const order = await this.lockEditableOrder(tx, orderId);

      // Regra 12: o estoque movimenta só a diferença por produto.
      const quantities = (list: { productId: bigint; quantity: number }[]) =>
        list.reduce(
          (map, item) =>
            map.set(
              item.productId,
              (map.get(item.productId) ?? 0) + item.quantity,
            ),
          new Map<bigint, number>(),
        );
      const before = quantities(order.items);
      const after = quantities(items);
      const touched = [...new Set([...before.keys(), ...after.keys()])];

      // Itens já vendidos mantêm o preço da venda (regra 8).
      const soldPrice = new Map(
        order.items.map((item) => [item.productId, item.unitPrice]),
      );
      const newProducts = [...after.keys()].filter((id) => !soldPrice.has(id));
      const prices = await this.lockProducts(tx, newProducts);
      for (const [id, price] of soldPrice) prices.set(id, price.toString());

      for (const productId of touched) {
        const delta =
          (after.get(productId) ?? 0) - (before.get(productId) ?? 0);
        if (delta === 0) continue;
        await moveStock(tx, productId, -delta, {
          type: "ADJUSTMENT",
          orderId,
          userId: actor.id,
        });
      }

      // Movimentos antigos apontam para itens que serão recriados.
      await tx.stockMovement.updateMany({
        where: { orderId },
        data: { orderItemId: null },
      });
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.order.update({
        where: { id: orderId },
        data: {
          ...(notes !== undefined ? { notes: notes || null } : {}),
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: prices.get(item.productId)!,
              notes: item.notes || null,
            })),
          },
        },
      });
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: adminOrderInclude,
      });
    });
  }

  cancel(
    orderId: bigint,
    reason: string,
    restoreStock: boolean,
    actor: Actor,
  ): Promise<AdminOrderRecord> {
    return this.prismaClient.$transaction(async (tx) => {
      // Regra 17: o bloqueio impede cancelar duas vezes e repor em dobro.
      const order = await this.lockEditableOrder(tx, orderId);
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: actor.id,
          cancellationSource: actor.role,
          cancellationReason: reason,
          restoreStock,
        },
      });
      if (restoreStock) {
        for (const item of order.items) {
          await moveStock(tx, item.productId, item.quantity, {
            type: "CANCELLATION",
            orderId,
            orderItemId: item.id,
            userId: actor.id,
          });
        }
      }
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: adminOrderInclude,
      });
    });
  }

  private async lockEditableOrder(tx: Tx, orderId: bigint) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, attendance: { select: { status: true } } },
    });
    if (!order) throw new AppError("Pedido não encontrado", 404);
    if (order.status === "CANCELLED") {
      throw new AppError("Pedido já foi cancelado", 409);
    }
    if (
      !(ACTIVE_ATTENDANCE as readonly string[]).includes(
        order.attendance.status,
      )
    ) {
      throw new AppError("A conta deste pedido já foi fechada", 409);
    }
    return order;
  }

  /** Valida catálogo e disponibilidade; devolve o preço atual de cada produto. */
  private async lockProducts(tx: Tx, ids: bigint[]) {
    const prices = new Map<bigint, string>();
    if (ids.length === 0) return prices;
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        available: true,
      },
    });
    for (const id of ids) {
      const product = products.find((entry) => entry.id === id);
      if (!product?.active || !product.available) {
        throw new AppError(
          `${product?.name ?? "Produto"} não está disponível para pedidos`,
          409,
        );
      }
      prices.set(id, product.price.toString());
    }
    return prices;
  }
}
