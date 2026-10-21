import type { FastifyReply, FastifyRequest } from "fastify";
import { confirmAttendancePaymentParamsSchema } from "./dto/confirm-attendance-payment.dto.js";
import { PaymentService } from "./payment.service.js";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  async confirm(request: FastifyRequest, reply: FastifyReply) {
    const { attendanceId } = confirmAttendancePaymentParamsSchema.parse(
      request.params,
    );

    reply.header("Cache-Control", "no-store");

    return this.service.confirmAttendancePayment(attendanceId);
  }
}
