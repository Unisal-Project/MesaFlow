import type { FastifyReply, FastifyRequest } from "fastify";
import { confirmAttendancePaymentParamsSchema } from "./dto/confirm-attendance-payment.dto.js";
import { PaymentService } from "./payment.service.js";
import { closeAttendanceSchema } from "./dto/close-attendance.dto.js";
import { actorFrom } from "../orders/admin-order.controller.js";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  async close(request: FastifyRequest, reply: FastifyReply) {
    const { attendanceId } = confirmAttendancePaymentParamsSchema.parse(
      request.params,
    );
    const data = closeAttendanceSchema.parse(request.body);
    reply.header("Cache-Control", "no-store");
    return this.service.closeAttendance(
      attendanceId,
      data,
      actorFrom(request).id,
    );
  }

  async confirm(request: FastifyRequest, reply: FastifyReply) {
    const { attendanceId } = confirmAttendancePaymentParamsSchema.parse(
      request.params,
    );

    reply.header("Cache-Control", "no-store");

    return this.service.confirmAttendancePayment(attendanceId);
  }
}
