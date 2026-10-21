import { prisma } from "../../../database/prisma.js";

import { OrderEntity } from "../entity/orders.entity.js";

import type { OrderRepository, CreateOrderData } from "./order.repository.js";
import type { OrderWithItems } from "./order-with-item.repository.js";
import type { Order, OrderItem } from "../../../generated/prisma/client.js";

type PrismaOrderWithItems = Order & {
    items: OrderItem[];
};

export class PrismaOrderRepository implements OrderRepository{

    async create(data: CreateOrderData): Promise<OrderWithItems>{
        const order = await prisma.order.create({
            data: {
                attendanceId: data.attendanceId,
                notes: data.notes,
                items: { 
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        notes: item.notes,
                    })) 
                },
            },
            include: { items: true },
        });

        return this.toOrderWithItems(order);
    }

    async findByAttendanceId(attendanceId: bigint): Promise<OrderWithItems[]> {
        const orders = await prisma.order.findMany({
            where: { attendanceId },
            include: { items: true },
            orderBy: { createdAt: "asc" },
        });

        return orders.map((order) =>
            this.toOrderWithItems(order)
        );
    }

    private toEntity(order: Order): OrderEntity{
        return new OrderEntity(
            order.id,
            order.attendanceId,
            order.status,
            order.notes,
            order.createdById,
            order.cancelledAt,
            order.cancelledById,
            order.cancellationSource,
            order.cancellationReason,
            order.restoreStock,
            order.createdAt,
            order.updatedAt
        )
    }

    private toOrderWithItems(order: PrismaOrderWithItems): OrderWithItems {
        return{
            order: this.toEntity(order),

            items: order.items.map((item) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice.toString(),
                notes: item.notes
            }))
        }
    }
}
