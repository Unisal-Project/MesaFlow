import type { FastifyReply, FastifyRequest } from "fastify";

import { confirmAttendancePaymentParamsSchema } from "./dto/confirm-attendance-payment.dto.js";
import { closeAttendanceSchema } from "./dto/close-attendance.dto.js";
import { PaymentService } from "./payment.service.js";
import { actorFrom } from "../orders/admin-order.controller.js";

import { AppError } from "../../shared/errors/app-errors.js";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  async close(request: FastifyRequest, reply: FastifyReply) {
    const { attendanceId } = confirmAttendancePaymentParamsSchema.parse(
      request.params,
    );

    const data = closeAttendanceSchema.parse(request.body);

    reply.header("Cache-Control", "no-store");

    const actor = actorFrom(request);

    if (actor.id === null) {
      throw new AppError("Funcionário não identificado", 401);
    }

    return this.service.closeAttendance(attendanceId, data, actor.id);
  }

  async reopen(request: FastifyRequest, reply: FastifyReply) {
    const { attendanceId } = confirmAttendancePaymentParamsSchema.parse(
      request.params,
    );

    reply.header("Cache-Control", "no-store");

    return this.service.reopenAttendance(attendanceId);
  }

  async confirm(request: FastifyRequest, reply: FastifyReply) {
    const { attendanceId } = confirmAttendancePaymentParamsSchema.parse(
      request.params,
    );

    reply.header("Cache-Control", "no-store");

    const actor = actorFrom(request);

    if (actor.id === null) {
      throw new AppError("Funcionário não identificado", 401);
    }

    return this.service.confirmAttendancePayment(attendanceId, actor.id);
  }
}
