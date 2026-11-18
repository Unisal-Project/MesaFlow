import { PrismaConnector } from "../../../database/prisma.js";

import { AppError } from "../../../shared/errors/app-errors.js";
import { moveItemsStock } from "../stock.js";
import { formatBusinessDate, nextDailyNumber } from "../daily-number.js";
import { OrderEntity } from "../entity/orders.entity.js";

import type { OrderRepository, CreateOrderData } from "./order.repository.js";
import type { OrderWithItems } from "./order-with-item.repository.js";
import type { Order, OrderItem } from "../../../generated/prisma/client.js";

type PrismaOrderWithItems = Order & {
  items: OrderItem[];
};

export class PrismaOrderRepository implements OrderRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async create(data: CreateOrderData): Promise<OrderWithItems> {
    return this.prismaClient.$transaction(async (tx) => {
      const identity = await tx.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { tableId: true },
      });
      if (!identity) throw new AppError("Atendimento não encontrado.", 404);
      // A mesma ordem de bloqueios usada pelo cadastro de pedidos da mesa.
      await tx.$queryRaw`SELECT id FROM restaurant_tables WHERE id = ${identity.tableId} FOR UPDATE`;
      const [attendance] = await tx.$queryRaw<
        Array<{ id: bigint; status: string }>
      >`
        SELECT id, status FROM attendances WHERE id = ${data.attendanceId} FOR UPDATE
      `;
      if (!attendance || attendance.status !== "OPEN") {
        throw new AppError("Atendimento não está aberto para pedidos.", 409);
      }
      const number = await nextDailyNumber(tx);
      const order = await tx.order.create({
        data: {
          ...number,
          attendanceId: data.attendanceId,
          customerName: data.customerName,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              notes: item.notes,
            })),
          },
        },
        include: { items: true },
      });
      await moveItemsStock(tx, order.items, -1, {
        type: "SALE",
        orderId: order.id,
        userId: null,
      });
      await tx.printJob.create({ data: { orderId: order.id, type: "ORDER" } });
      return this.toOrderWithItems(order);
    });
  }

  async findByAttendanceId(attendanceId: bigint): Promise<OrderWithItems[]> {
    const orders = await this.prismaClient.order.findMany({
      where: { attendanceId },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    return orders.map((order) => this.toOrderWithItems(order));
  }

  private toEntity(order: Order): OrderEntity {
    return new OrderEntity(
      order.id,
      order.attendanceId,
      order.status,
      order.notes,
      order.customerName,
      order.createdById,
      order.cancelledAt,
      order.cancelledById,
      order.cancellationSource,
      order.cancellationReason,
      order.restoreStock,
      order.createdAt,
      order.updatedAt,
      order.dailyNumber,
      formatBusinessDate(order.businessDate),
    );
  }

  private toOrderWithItems(order: PrismaOrderWithItems): OrderWithItems {
    return {
      order: this.toEntity(order),

      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        notes: item.notes,
      })),
    };
  }
}
