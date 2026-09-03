import type { FastifyReply, FastifyRequest } from "fastify";

import { createOrderSchema } from "./order.schema.js";
import { createOrder } from "./order.service.js";

export async function createOrderController(request: FastifyRequest, reply: FastifyReply){
    //validar o body
    const data =createOrderSchema.parse(request.body);
    
    //chamando o service
    const order = await createOrder(data);

    const response = {
        ...order,
        id: order.id.toString(),
        attendanceId: order.attendanceId.toString(),
        items: order.items.map((item) => ({
            ...item,
            id: item.id.toString(),
            orderId: item.orderId.toString(),
            productId: item.productId.toString(),
        })),
    };

    return reply.status(201).send(response);
}