import type { TableBillData } from "../types/tableBill.types";

export const mockTableBill: TableBillData = {
  status: "open",
  orders: [{ id: 1842, amountInCents: 4890 }],
  serviceInCents: 489,
  cartItemCount: 0,
};