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

// ---- Administrativo ----

export type PaymentMethodCode = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

export type AdminOrderResponse = {
  id: string;
  status: "PENDING" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  notes: string | null;
  customerName: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  table: { id: string; number: number; name: string | null };
  attendance: {
    id: string;
    status: "OPEN" | "CLOSING_REQUESTED" | "AWAITING_PAYMENT" | "CLOSED" | "CANCELLED";
    closedAt: string | null;
    serviceFee: string | null;
    payments: Array<{
      method: PaymentMethodCode | null;
      amount: string;
      receivedAmount: string | null;
      changeAmount: string | null;
      processingFee: string | null;
    }>;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    notes: string | null;
  }>;
};

export type AdminOrderItemsInput = {
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  notes?: string | null;
};

export type CloseAttendanceInput = {
  serviceFeeWaived: boolean;
  payments: Array<{
    method: PaymentMethodCode;
    amount: number;
    receivedAmount?: number;
    processingFee?: number;
  }>;
};

export const fetchAdminOrders = (days = 90) =>
  apiRequest<AdminOrderResponse[]>(`/orders?days=${days}`);

export const createTableOrder = (tableId: string, input: AdminOrderItemsInput) =>
  apiRequest<AdminOrderResponse>(`/tables/${tableId}/orders`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateOrderItems = (orderId: string, input: AdminOrderItemsInput) =>
  apiRequest<AdminOrderResponse>(`/orders/${orderId}/items`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const cancelAdminOrder = (
  orderId: string,
  input: { reason: string; restoreStock: boolean },
) =>
  apiRequest<AdminOrderResponse>(`/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const closeAttendance = (attendanceId: string, input: CloseAttendanceInput) =>
  apiRequest<{ total: string; serviceFee: string }>(
    `/attendances/${attendanceId}/close`,
    { method: "POST", body: JSON.stringify(input) },
  );

export type SalesReportDay = {
  date: string;
  revenue: number;
  orders: number;
  tables: number;
  serviceFee: number;
  cancellations: number;
  payments: Partial<Record<PaymentMethodCode, number>>;
  products: { name: string; quantity: number }[];
};

export type SalesReport = {
  start: string;
  end: string;
  days: SalesReportDay[];
  previous: { revenue: number; orders: number; tables: number };
  activeCategories: number;
};

export const fetchSalesReport = (start: string, end: string) =>
  apiRequest<SalesReport>(
    `/reports/sales?start=${start}&end=${end}&tzOffset=${new Date().getTimezoneOffset()}`,
  );
