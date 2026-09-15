export type TableBillData = {
  status: "open" | "closed";
  orders: { id: number; amountInCents: number }[];
  serviceInCents: number;
  cartItemCount: number;
};

// Mock de apresentação. Os valores monetários são inteiros em centavos.
// Futuramente, passe os dados da API pela prop `bill` da página.
export const mockTableBill: TableBillData = {
  status: "open",
  orders: [{ id: 1842, amountInCents: 4890 }],
  serviceInCents: 489,
  cartItemCount: 0,
};
