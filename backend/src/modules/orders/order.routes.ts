import type { FastifyInstance } from "fastify";

import { createOrderController } from "./order.controller.js";

export async function orderRoutes(app: FastifyInstance) {
    //criando rota HTTP POST
    app.post('/orders', createOrderController);
}