import type { OrderWithItems } from "./order-with-item.repository.js";

export interface CreateOrderItemData {
    productId: bigint;
    quantity: number;
    unitPrice: string;
    notes?: string;
}

export interface CreateOrderData{
    attendanceId: bigint;
    notes?: string;
    items: CreateOrderItemData[];
}

export interface OrderRepository {
    create(data: CreateOrderData): Promise<OrderWithItems>;

    findByAttendanceId(attendanceId: bigint): Promise<OrderWithItems[]>;
}
