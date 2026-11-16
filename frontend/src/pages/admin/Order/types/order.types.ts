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
  productId?: string;
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
    /** Dia do fechamento (AAAA-MM-DD), base dos indicadores de vendas. */
    closedOn?: string;
    serviceFee?: number;
    serviceFeeWaived?: boolean;
    orderIds?: number[];
  };
};

/** Produto do cardápio oferecido no formulário de pedido. */
export type OrderCatalogProduct = {
  id: string;
  name: string;
  unitPrice: number;
  /** null = produto sem controle de estoque. */
  stock: number | null;
};

export type OrderTableOption = { id: string; label: string };

export type OrderFormChanges = {
  tableId: string;
  items: OrderItem[];
  observation?: string;
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
  "open" | "closed";

export type OrderFilter = "all" | OrderStatus;

export type OrderSort = "newest" | "oldest";

export type OrderPeriod = "today" | "yesterday" | "7days" | "30days" | "all" | "specific";

export type OrderSummary = {
  id: number;
  table: string;
  status: OrderStatus;
};

export type DatedOrderSummary = OrderSummary & { date: string };
