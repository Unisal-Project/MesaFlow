import { z } from "zod";
import { issuePaymentSession } from "../payments/payment-confirmation.routes.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { qrOrderSchema, qrTokenParamSchema } from "./dto/qr-order.dto.js";
import { QrOrderService } from "./qr-order.service.js";

export class QrOrderController {
  constructor(private readonly service: QrOrderService) {}

  async submit(request: FastifyRequest, reply: FastifyReply) {
    const { token } = qrTokenParamSchema.parse(request.params);

    const data = qrOrderSchema.parse(request.body);

    reply.header("Cache-Control", "no-store");

    const order = await this.service.submit(token, data);
    return reply.status(201).send({
      ...order,
      paymentSession: issuePaymentSession(request.server, order.attendanceId),
    });
  }

  async requestClosing(request: FastifyRequest, reply: FastifyReply) {
    const { token } = qrTokenParamSchema.parse(request.params);

    reply.header("Cache-Control", "no-store");

    const body = z
      .object({ attendanceId: z.string().regex(/^\d+$/) })
      .optional()
      .parse(request.body);
    const closing = await this.service.requestClosing(
      token,
      body?.attendanceId,
    );
    if (!body) return closing;
    return {
      ...closing,
      paymentSession: issuePaymentSession(request.server, closing.attendanceId),
    };
  }

  async findBill(request: FastifyRequest, reply: FastifyReply) {
    const { token } = qrTokenParamSchema.parse(request.params);

    reply.header("Cache-Control", "no-store");

    return reply.status(200).send(await this.service.findBill(token));
  }
}
