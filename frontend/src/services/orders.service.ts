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
  paymentSession: string;
  attendanceId: string;
  order: OrderResponse & {
    customerName: string | null;
  };
};

export type BillItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
};

export type TableBillResponse = {
  attendanceId: string | null;
  attendanceStatus: "OPEN" | "CLOSING_REQUESTED" | "AWAITING_PAYMENT" | null;
  items: BillItem[];
};

export function fetchTableBill(token: string, signal?: AbortSignal) {
  return apiRequest<TableBillResponse>(
    `/tables/by-token/${encodeURIComponent(token)}/bill`,
    { signal },
  );
}

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
  /** Número curto do pedido no dia de operação; `id` segue sendo o identificador. */
  dailyNumber?: number;
  /** Dia de operação (AAAA-MM-DD). */
  businessDate?: string;
  status: "PENDING" | "CANCELLED";
  notes: string | null;
  customerName: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  table: { id: string; number: number; name: string | null };
  attendance: {
    id: string;
    status:
      | "OPEN"
      | "CLOSING_REQUESTED"
      | "AWAITING_PAYMENT"
      | "CLOSED"
      | "CANCELLED";
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

/** Lista de trabalho: contas abertas + hoje e ontem + fechadas nas últimas 48 h. */
export const fetchOperationalOrders = () =>
  apiRequest<AdminOrderResponse[]>("/orders?scope=operational");

/** Só o necessário para avisar pedido novo (sem itens nem pagamentos). */
export type AdminOrderSummary = Pick<
  AdminOrderResponse,
  "id" | "dailyNumber" | "businessDate" | "status" | "createdAt" | "table"
> & { attendance: { id: string; status: AdminOrderResponse["attendance"]["status"] } };

export const fetchOrderSummaries = () =>
  apiRequest<AdminOrderSummary[]>("/orders?scope=operational&view=summary");

export const createTableOrder = (
  tableId: string,
  input: AdminOrderItemsInput,
) =>
  apiRequest<AdminOrderResponse>(`/tables/${tableId}/orders`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateOrderItems = (
  orderId: string,
  input: AdminOrderItemsInput,
) =>
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

export const closeAttendance = (
  attendanceId: string,
  input: CloseAttendanceInput,
) =>
  apiRequest<{ total: string; serviceFee: string }>(
    `/attendances/${attendanceId}/close`,
    { method: "POST", body: JSON.stringify(input) },
  );

/** ADMIN: reabre conta fechada; os pagamentos dela são estornados. */
export const reopenAttendance = (attendanceId: string) =>
  apiRequest<{ attendanceId: string; refundedPayments: number }>(
    `/attendances/${attendanceId}/reopen`,
    { method: "POST" },
  );

export type SalesReportDay = {
  date: string;
  revenue: number;
  orders: number;
  tables: number;
  serviceFee: number;
  cancellations: number;
  payments: Partial<Record<PaymentMethodCode, number>>;
  products: { productId: string; name: string; quantity: number }[];
};

export type SalesReport = {
  start: string;
  end: string;
  days: SalesReportDay[];
  previous: { revenue: number; orders: number; tables: number };
  activeCategories: number;
};

export const fetchSalesReport = (start: string, end: string) =>
  // Dias de operação (fuso e virada do restaurante): o servidor não precisa do fuso do navegador.
  apiRequest<SalesReport>(`/reports/sales?start=${start}&end=${end}`);
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
