import type { FastifyInstance } from "fastify";
import { qrTokenParamSchema } from "./dto/qr-order.dto.js";
import { tableIdSchema } from "./dto/table-id.dto.js";
import { WaiterCallService } from "./waiter-call.service.js";

export function waiterCallRoutes(
  app: FastifyInstance,
  service = new WaiterCallService(),
) {
  app.post("/tables/by-token/:token/call-waiter", async (request, reply) => {
    const { token } = qrTokenParamSchema.parse(request.params);
    reply.header("Cache-Control", "no-store");
    return service.call(token);
  });
  app.get("/waiter-calls", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    return service.pending();
  });
  app.patch("/waiter-calls/:id/attend", async (request, reply) => {
    const { id } = tableIdSchema.parse(request.params);
    reply.header("Cache-Control", "no-store");
    return service.attend(id);
  });
}
