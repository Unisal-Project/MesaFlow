import type { FastifyReply, FastifyRequest } from "fastify";

import { createOrderSchema } from "./dto/create-order.dto.js";
import { findOrdersByAttendanceIdSchema } from "./dto/find-orders-attendance.dto.js";

import { makeOrderService } from "./order.factory.js";

import { serializeBigInt } from "../../shared/utils/serialize-bigint.js";

const orderService = makeOrderService();

export async function createOrderController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = createOrderSchema.parse(request.body);

  const result = await orderService.createOrder(data);

  return reply.status(201).send(
    serializeBigInt({
      ...result.order,
      items: result.items,
    }),
  );
}

export async function findOrdersByAttendanceIdController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { attendanceId } = findOrdersByAttendanceIdSchema.parse(request.params);

  const results = await orderService.findOrdersByAttendanceId(
    BigInt(attendanceId),
  );

  const response = results.map((result) => ({
    ...result.order,
    items: result.items,
  }));

  return reply.status(200).send(serializeBigInt(response));
}
