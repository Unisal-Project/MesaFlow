import { List, ReceiptText, ShoppingCart, ClipboardList } from "lucide-react";
import { useCart } from "@/contexts/useCart";
import { BottomNavigation } from "./BottomNavigation";
import "./clientTabBar.scss";

type ClientTabBarProps = {
  activeId?: "menu" | "order" | "orders" | "bill";
  onMenu: () => void;
  onOrder: () => void;
  onNavigate?: (destination: string) => void;
};

export function ClientTabBar({
  activeId = "menu",
  onMenu,
  onOrder,
  onNavigate,
}: ClientTabBarProps) {
  const { itemCount } = useCart();
  const items = [
    { id: "menu", label: "Cardápio", icon: <List aria-hidden="true" /> },
    { id: "order", label: `Carrinho (${itemCount})`, icon: <ShoppingCart aria-hidden="true" /> },
    { id: "orders", label: "Pedidos", icon: <ClipboardList aria-hidden="true" /> },
    { id: "bill", label: "Conta", icon: <ReceiptText aria-hidden="true" /> },
  ];

  const handleNavigate = (destination: string) => {
    switch (destination) {
      case "menu":
        onMenu();
        break;
      case "order":
        onOrder();
        break;
      default:
        onNavigate?.(destination);
    }
  };

  return (
    <BottomNavigation
      className="client-tabbar"
      activeId={activeId}
      items={items}
      onChange={handleNavigate}
    />
  );
}
