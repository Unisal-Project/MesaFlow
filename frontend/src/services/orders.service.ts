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

export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type AttendanceOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
};

export type AttendanceOrder = {
  id: string;
  status: OrderStatus;
  customerName: string | null;
  createdAt: string;
  notes: string | null;
  items: AttendanceOrderItem[];
};

export type AttendanceOrdersResponse = {
  attendanceId: string | null;
  attendanceStatus: 
    | "OPEN"
    | "CLOSING_REQUESTED"
    | "AWAITING_PAYMENT"
    | null;
  orders: AttendanceOrder[];
};

export function fetchOrdersByTableToken(
  token: string,
  signal?: AbortSignal,
): Promise<AttendanceOrdersResponse> {
  return apiRequest<AttendanceOrdersResponse>(
    `/tables/by-token/${encodeURIComponent(token)}/orders`,
    {
      signal,
    },
  );
}

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
