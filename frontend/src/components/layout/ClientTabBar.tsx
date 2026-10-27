import { List, ReceiptText, ShoppingCart } from "lucide-react";
import { BottomNavigation } from "./BottomNavigation";
import "./clientTabBar.scss";

type ClientTabBarProps = {
  activeId?: "menu" | "order" | "bill";
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
  const items = [
    { id: "menu", label: "Cardápio", icon: <List aria-hidden="true" /> },
    { id: "order", label: "Pedido", icon: <ShoppingCart aria-hidden="true" /> },
    ...(onNavigate
      ? [
          {
            id: "bill",
            label: "Conta",
            icon: <ReceiptText aria-hidden="true" />,
          },
        ]
      : []),
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
