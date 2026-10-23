import type {
  OrderItem,
  OrderStatus,
  OrderFilter,
} from "../types/order.types";

export const paymentMethodLabels = {
  pix: "Pix",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
} as const;

export const statusDetails: Record<
  OrderStatus,
  { label: string; nextAction: string }
> = {
  waiting: { label: "Aguardando", nextAction: "Iniciar preparo" },
  preparing: { label: "Em preparo", nextAction: "Marcar como pronto" },
  ready: { label: "Pronto", nextAction: "Pedido pronto" },
  delivered: { label: "Entregue", nextAction: "Pedido entregue" },
  closed: { label: "Fechado", nextAction: "Pedido fechado" },
};

export const orderFilters: {
  value: OrderFilter;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "waiting", label: "Aguardando" },
  { value: "preparing", label: "Em preparo" },
  { value: "ready", label: "Pronto" },
];

export const orderStatuses: OrderStatus[] = [
  "waiting",
  "preparing",
  "ready",
  "delivered",
  "closed",
];

export const emptyOrderItems: OrderItem[] = [
  {
    name: "",
    quantity: 1,
    unitPrice: 0,
    observation: "",
  },
];