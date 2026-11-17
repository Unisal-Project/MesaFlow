import type { FastifyInstance, FastifyRequest } from "fastify";

import {
  adminOrderItemsSchema,
  cancelOrderSchema,
  listOrdersQuerySchema,
  orderIdParamsSchema,
  tableIdParamsSchema,
} from "./dto/admin-order.dto.js";
import {
  PrismaAdminOrderRepository,
  type Actor,
  type AdminOrderRecord,
} from "./repositories/prisma-admin-order.repository.js";

import { formatBusinessDate } from "./daily-number.js";

const money = (value: { toString(): string } | null | undefined) =>
  value == null ? null : value.toString();

/** Formato único devolvido por todas as rotas de pedidos do administrativo. */
export function presentAdminOrder(order: AdminOrderRecord) {
  const { attendance } = order;
  return {
    id: order.id.toString(),
    dailyNumber: order.dailyNumber,
    businessDate: formatBusinessDate(order.businessDate),
    status: order.status,
    notes: order.notes,
    customerName: order.customerName,
    createdAt: order.createdAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancellationReason: order.cancellationReason,
    table: {
      id: attendance.table.id.toString(),
      number: attendance.table.number,
      name: attendance.table.name,
    },
    attendance: {
      id: attendance.id.toString(),
      status: attendance.status,
      closedAt: attendance.closedAt?.toISOString() ?? null,
      serviceFee: money(attendance.serviceFee),
      payments: attendance.payments.map((payment) => ({
        method: payment.method,
        amount: money(payment.amount),
        receivedAmount: money(payment.receivedAmount),
        changeAmount: money(payment.changeAmount),
        processingFee: money(payment.processingFee),
      })),
    },
    items: order.items.map((item) => ({
      id: item.id.toString(),
      productId: item.productId.toString(),
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      notes: item.notes,
    })),
  };
}

export function actorFrom(request: FastifyRequest): Actor {
  const { id, role } = request.user;
  return {
    id: /^\d+$/.test(id) ? BigInt(id) : null,
    role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
  };
}

export async function adminOrderRoutes(
  app: FastifyInstance,
  options: { repository?: PrismaAdminOrderRepository } = {},
) {
  const repository = options.repository ?? new PrismaAdminOrderRepository();

  app.get("/orders", async (request, reply) => {
    const { days } = listOrdersQuerySchema.parse(request.query);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    reply.header("Cache-Control", "no-store");
    return (await repository.findSince(since)).map(presentAdminOrder);
  });

  app.post("/tables/:id/orders", async (request, reply) => {
    const { id } = tableIdParamsSchema.parse(request.params);
    const { items, notes } = adminOrderItemsSchema.parse(request.body);
    const order = await repository.createForTable(
      id,
      items,
      notes,
      actorFrom(request),
    );
    return reply.status(201).send(presentAdminOrder(order));
  });

  app.put("/orders/:id/items", async (request) => {
    const { id } = orderIdParamsSchema.parse(request.params);
    const { items, notes } = adminOrderItemsSchema.parse(request.body);
    return presentAdminOrder(
      await repository.replaceItems(id, items, notes, actorFrom(request)),
    );
  });

  app.post("/orders/:id/cancel", async (request) => {
    const { id } = orderIdParamsSchema.parse(request.params);
    const { reason, restoreStock } = cancelOrderSchema.parse(request.body);
    return presentAdminOrder(
      await repository.cancel(id, reason, restoreStock, actorFrom(request)),
    );
  });
}
