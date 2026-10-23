import type { Ref } from "react";
import type { useOrder } from "../hooks/useOrder";

export type PaymentMethod = "pix" | "cash" | "debit" | "credit";

export type CompletedPayment = {
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number;
  change?: number;
  processingFeeRate?: number;
  processingFee?: number;
};

export type OrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  observation?: string;
  unitObservations?: string[];
};

export type Order = OrderSummary & {
  tableId?: string;
  attendanceId?: string;
  date: string;
  time: string;
  items: OrderItem[];
  unread?: boolean;
  observation?: string;
  payment?: {
    entries: CompletedPayment[];
    closedAt: string;
  };
};

export type OrdersHandle = {
  openOrder: (orderId?: number) => void;
};

export type OrdersProps = {
  onSelectOrder?: (orderId: number) => void;
  state: ReturnType<typeof useOrder>;
  ref?: Ref<OrdersHandle>;
  onNavigate?: (id: string) => void;
};

export type OrderStatus =
  "waiting" | "preparing" | "ready" | "delivered" | "closed";

export type OrderFilter = "all" | OrderStatus;

export type OrderSort = "newest" | "oldest";

export type OrderPeriod = "today" | "7days" | "30days" | "all" | "specific";

export type OrderSummary = {
  id: number;
  table: string;
  status: OrderStatus;
};

export type DatedOrderSummary = OrderSummary & { date: string };
