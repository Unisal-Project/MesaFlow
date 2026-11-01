export type TableBillData = {
  status: "open" | "closed";
  orders: { id: number; amountInCents: number }[];
  cartItemCount: number;
};

export type TableBillProps = {
  bill?: TableBillData;
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
};

export type BillClosingOption = "cashier" | "waiter" | "split";
