import type { FastifyReply, FastifyRequest } from "fastify";
import { qrOrderSchema, qrTokenParamSchema } from "./dto/qr-order.dto.js";
import { QrOrderService } from "./qr-order.service.js";

export class QrOrderController {
  constructor(private readonly service: QrOrderService) {}

  async submit(request: FastifyRequest, reply: FastifyReply) {
    const { token } = qrTokenParamSchema.parse(request.params);
    const data = qrOrderSchema.parse(request.body);
    reply.header("Cache-Control", "no-store");
    return reply.status(201).send(await this.service.submit(token, data));
  }

  async requestClosing(request: FastifyRequest, reply: FastifyReply) {
    const { token } = qrTokenParamSchema.parse(request.params);
    reply.header("Cache-Control", "no-store");
    return this.service.requestClosing(token);
  }
}
