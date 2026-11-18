import { PrismaConnector } from "../../../database/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import { moveItemsStock, moveStock } from "../stock.js";
import { nextDailyNumber, toBusinessDate } from "../daily-number.js";
import { effectivePrice, promoSelect } from "../../products/promotion.js";

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

export const adminOrderSummarySelect = {
  id: true,
  dailyNumber: true,
  businessDate: true,
  status: true,
  createdAt: true,
  attendance: {
    select: {
      id: true,
      status: true,
      table: { select: { id: true, number: true, name: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type AdminOrderSummaryRecord = Prisma.OrderGetPayload<{
  select: typeof adminOrderSummarySelect;
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

  /** Lista de trabalho: o que a operação ainda precisa ver, sem varrer 90 dias. */
  async findOperational(now = new Date()): Promise<AdminOrderRecord[]> {
    return this.prismaClient.order.findMany({
      where: await this.operationalWhere(now),
      include: adminOrderInclude,
      orderBy: { id: "desc" },
    });
  }

  /** Versão enxuta (avisos de pedido novo): sem itens, produtos nem pagamentos. */
  async findSummary(
    where: Prisma.OrderWhereInput,
  ): Promise<AdminOrderSummaryRecord[]> {
    return this.prismaClient.order.findMany({
      where,
      select: adminOrderSummarySelect,
      orderBy: { id: "desc" },
    });
  }

  async operationalWhere(now: Date): Promise<Prisma.OrderWhereInput> {
    const settings = await this.prismaClient.restaurantSettings.findUnique({
      where: { id: 1 },
      select: { timezone: true, dayCutoffHour: true },
    });
    const today = toBusinessDate(
      now,
      settings?.timezone ?? "America/Sao_Paulo",
      settings?.dayCutoffHour ?? 5,
    );
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000);
    return {
      OR: [
        { attendance: { status: { in: [...ACTIVE_ATTENDANCE] } } },
        { businessDate: { gte: yesterday } },
        // Conta fechada há pouco com pedidos mais antigos (ex.: virou a noite).
        {
          attendance: {
            closedAt: { gte: new Date(now.getTime() - 172_800_000) },
          },
        },
      ],
    };
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

      const [locked] = await tx.$queryRaw<
        { status: string }[]
      >`SELECT status FROM attendances WHERE id = ${attendanceId} FOR UPDATE`;
      if (locked?.status !== "OPEN")
        throw new AppError(
          "A conta desta mesa já foi solicitada; não aceita novos pedidos",
          409,
        );

      // Contador antes dos produtos: mesma ordem de lock nos 3 caminhos.
      const number = await nextDailyNumber(tx);
      const prices = await this.lockProducts(
        tx,
        items.map((item) => item.productId),
      );
      const order = await tx.order.create({
        data: {
          ...number,
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
      await moveItemsStock(tx, order.items, -1, {
        type: "SALE",
        orderId: order.id,
        userId: actor.id,
      });
      await tx.printJob.create({ data: { orderId: order.id, type: "ORDER" } });
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: adminOrderInclude,
      });
    });
  }

  async replaceItems(
    orderId: bigint,
    items: AdminOrderItemInput[],
    notes: string | null | undefined,
    actor: Actor,
  ): Promise<AdminOrderRecord> {
    const reference = await this.findOrderReference(orderId);
    return this.prismaClient.$transaction(async (tx) => {
      const order = await this.lockEditableOrder(
        tx,
        orderId,
        reference.attendance.tableId,
        reference.attendanceId,
      );

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
      const touched = [...new Set([...before.keys(), ...after.keys()])].sort(
        (a, b) => (a < b ? -1 : a > b ? 1 : 0),
      );

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

  async cancel(
    orderId: bigint,
    reason: string,
    restoreStock: boolean,
    actor: Actor,
  ): Promise<AdminOrderRecord> {
    const reference = await this.findOrderReference(orderId);
    return this.prismaClient.$transaction(async (tx) => {
      // Regra 17: o bloqueio impede cancelar duas vezes e repor em dobro.
      const order = await this.lockEditableOrder(
        tx,
        orderId,
        reference.attendance.tableId,
        reference.attendanceId,
      );
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
        await moveItemsStock(tx, order.items, 1, {
          type: "CANCELLATION",
          orderId,
          userId: actor.id,
        });
      }
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: adminOrderInclude,
      });
    });
  }

  private async findOrderReference(orderId: bigint) {
    // Descoberta fora do snapshot da transação: a leitura dos itens só ocorre após os locks.
    const reference = await this.prismaClient.order.findUnique({
      where: { id: orderId },
      select: { attendanceId: true, attendance: { select: { tableId: true } } },
    });
    if (!reference) throw new AppError("Pedido não encontrado", 404);
    return reference;
  }

  private async lockEditableOrder(
    tx: Tx,
    orderId: bigint,
    tableId: bigint,
    attendanceId: bigint,
  ) {
    await tx.$queryRaw`SELECT id FROM restaurant_tables WHERE id = ${tableId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM attendances WHERE id = ${attendanceId} FOR UPDATE`;
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

  /** Valida catálogo e disponibilidade; devolve o preço efetivo (com promoção). */
  private async lockProducts(tx: Tx, ids: bigint[]) {
    const prices = new Map<bigint, string>();
    if (ids.length === 0) return prices;
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        active: true,
        available: true,
        ...promoSelect,
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
      prices.set(id, effectivePrice(product));
    }
    return prices;
  }
}
