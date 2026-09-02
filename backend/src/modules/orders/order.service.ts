import { prisma } from '../../database/prisma.js';
import type { CreateOrderInput } from './order.schema.js';

export async function createOrder(data: CreateOrderInput) {
    const attendance = await prisma.attendance.findUnique({
        where: { id: BigInt(data.attendanceId) },
    });

    if(!attendance) {
        throw new Error("Atendimento não encontrado.");
    }
    if(attendance.status !== "OPEN"){
        throw new Error("Atendimento não está aberto para pedidos.");
    }

    const productIds = data.items.map((item) => {
        return BigInt(item.productId);
    })

    const products = await prisma.product.findMany({
        where: { 
            id: { in: productIds }, 
            active: true,
            available: true,
        },
    });

    //montando pedido com os itens
    const orderItems = data.items.map((item) => {
        const product = products.find(
            (product) => product.id === BigInt(item.productId),
        )

        if (!product) {
            throw new Error("Produto não encontrado ou indisponível.");
        }
        
        return {
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.price,
            notes: item.notes,
        };
    })

    //criando pedido no banco
    const order = await prisma.order.create({
        data: {
            attendanceId: BigInt(data.attendanceId),
            notes: data.notes,
            items: { create: orderItems },
        },
        include: { items: true },
    });

    return order;
};