import {
  Clock,
  Menu,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

export const navigationItems = [
  {
    id: "menu",
    label: "Cardápio",
    icon: <Menu aria-hidden="true" />,
  },
  {
    id: "order",
    label: "Pedido",
    icon: <ShoppingCart aria-hidden="true" />,
  },
  {
    id: "status",
    label: "Status",
    icon: <Clock aria-hidden="true" />,
  },
  {
    id: "bill",
    label: "Conta",
    icon: <ReceiptText aria-hidden="true" />,
  },
];