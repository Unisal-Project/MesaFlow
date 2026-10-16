import type { OrderEntity } from "../entity/orders.entity.js";

export interface OrderItemData{
    id: bigint;
    orderId: bigint;
    productId: bigint;
    quantity: number;
    unitPrice: string;
    notes: string | null;
}

export interface OrderWithItems{
    order: OrderEntity;
    items: OrderItemData[];
}