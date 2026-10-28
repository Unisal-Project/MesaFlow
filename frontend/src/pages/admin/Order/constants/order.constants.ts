import type { OrderItem } from "../types/order.types";

export const paymentMethodLabels = {
  pix: "Pix",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
} as const;

export const emptyOrderItems: OrderItem[] = [
  {
    name: "",
    quantity: 1,
    unitPrice: 0,
    observation: "",
  },
];