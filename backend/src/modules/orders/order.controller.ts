import type { FastifyReply, FastifyRequest } from "fastify";

import { createOrderSchema, findOrdersByAttendanceIdSchema } from "./order.schema.js";
import { createOrder, findOrdersByAttendanceId } from "./order.service.js";

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

export async function findOrdersByAttendanceIdController(request: FastifyRequest, reply: FastifyReply){
    //validar o params
    const {attendanceId} = findOrdersByAttendanceIdSchema.parse(request.params);
    
    //chamando o service
    const orders = await findOrdersByAttendanceId(BigInt(attendanceId));

    const response = orders.map((order) => ({
        ...order,
        id: order.id.toString(),
        attendanceId: order.attendanceId.toString(),
        items: order.items.map((item) => ({
            ...item,
            id: item.id.toString(),
            orderId: item.orderId.toString(),
            productId: item.productId.toString(),
        })),
    }));

    return reply.status(200).send(response);
}