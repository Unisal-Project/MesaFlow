import type { FastifyInstance } from "fastify";

import { adminOrderRoutes } from "./admin-order.controller.js";
import {
  createOrderController,
  findOrdersByAttendanceIdController,
} from "./order.controller.js";

export async function orderRoutes(app: FastifyInstance) {
  app.get(
    "/attendances/:attendanceId/orders",
    findOrdersByAttendanceIdController,
  );

  app.post("/orders", createOrderController);

  await adminOrderRoutes(app);
}
