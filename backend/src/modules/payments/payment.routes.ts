import type { FastifyInstance } from "fastify";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";

const controller = new PaymentController(new PaymentService());

export async function paymentRoutes(app: FastifyInstance) {
  app.post("/attendances/:attendanceId/confirm-payment", (request, reply) =>
    controller.confirm(request, reply),
  );
}
