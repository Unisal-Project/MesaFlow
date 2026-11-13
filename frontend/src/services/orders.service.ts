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

export type CreateQrOrderInput = {
  customerName: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
  }>;
};

export type CreateQrOrderResponse = {
  attendanceId: string;
  order: OrderResponse & {
    customerName: string | null;
  };
};

export function createOrder(
  input: CreateOrderInput
): Promise<OrderResponse> {
  return apiRequest<OrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createQrOrder(
  token: string,
  input: CreateQrOrderInput,
): Promise<CreateQrOrderResponse> {
  return apiRequest<CreateQrOrderResponse>(
    `/tables/by-token/${encodeURIComponent(token)}/orders`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
