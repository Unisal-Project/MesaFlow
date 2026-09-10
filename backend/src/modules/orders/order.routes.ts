import type { FastifyInstance } from "fastify";

import { createOrderController, findOrdersByAttendanceIdController } from "./order.controller.js";

export async function orderRoutes(app: FastifyInstance) {
    //criando rota HTTP POST
    app.post('/orders', createOrderController);
    //criando rota HTTP GET
    app.get('/attendances/:attendanceId/orders', findOrdersByAttendanceIdController);
}
