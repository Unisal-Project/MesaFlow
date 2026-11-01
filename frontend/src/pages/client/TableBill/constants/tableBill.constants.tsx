import { 
      Menu,
    ShoppingCart,
    ReceiptText
} from "lucide-react";

import type { BillClosingOption } from "../types/tableBill.types";

export const closingOptions: { id: BillClosingOption; label: string }[] = [
  { id: "cashier", label: "Pagar no caixa" },
  { id: "waiter", label: "Chamar garçom" },
  { id: "split", label: "Dividir conta" },
];

export const navigationItems = [
  { id: "menu", label: "Cardápio", icon: <Menu aria-hidden="true" /> },
  { id: "order", label: "Pedido", icon: <ShoppingCart aria-hidden="true" /> },
  { id: "bill", label: "Conta", icon: <ReceiptText aria-hidden="true" /> },
];