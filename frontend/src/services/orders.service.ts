import { apiRequest } from "@/api/client";

export type CreateOrderInput = {
  attendanceId: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
  }>;
};

export type OrderItemResponse = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
};

export type OrderResponse = {
  id: string;
  attendanceId: string;
  notes: string | null;
  items: OrderItemResponse[];
};

export function createOrder(input: CreateOrderInput): Promise<OrderResponse> {
  return apiRequest<OrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
