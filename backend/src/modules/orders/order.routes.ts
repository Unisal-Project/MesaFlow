import type { FastifyInstance } from "fastify";

import { createOrderController, findOrdersByAttendanceIdController } from "./order.controller.js";

export async function orderRoutes(app: FastifyInstance) {
    app.get('/attendances/:attendanceId/orders', findOrdersByAttendanceIdController);
    
    app.post('/orders', createOrderController);
}
