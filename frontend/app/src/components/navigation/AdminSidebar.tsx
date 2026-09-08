import type { ReactNode } from "react";
import { classNames } from "../shared/classNames";
import cardapioIcon from "../../assets/cardapio-icon.png";
import dashboardIcon from "../../assets/dashboard-icon.png";
import mesasIcon from "../../assets/mesas-icon.png";
import pedidosIcon from "../../assets/pedidos-icon.png";
import relatoriosIcon from "../../assets/relatorios-icon.png";

export type SidebarItem = { id: string; label: string; icon?: ReactNode };

const adminSidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <img src={dashboardIcon} alt="" />,
  },
  {
    id: "orders",
    label: "Pedidos",
    icon: <img src={pedidosIcon} alt="" />,
  },
  {
    id: "tables",
    label: "Mesas",
    icon: <img src={mesasIcon} alt="" />,
  },
  {
    id: "menu",
    label: "Cardápio",
    icon: <img src={cardapioIcon} alt="" />,
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: <img src={relatoriosIcon} alt="" />,
  },
];

type AdminSidebarProps = {
  brand?: string;
  brandImage?: ReactNode;
  items?: SidebarItem[];
  activeId: string;
  onChange: (id: string) => void;
  userName: string;
  userRole: string;
};
export function AdminSidebar({
  brand = "MesaFlow",
  brandImage,
  items = adminSidebarItems,
  activeId,
  onChange,
  userName,
  userRole,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-image">
          {brandImage ?? brand.charAt(0).toUpperCase()}
        </div>
        <div className="admin-brand-text">
          <strong>{brand}</strong>
          <small>Administrativo</small>
        </div>
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={classNames(item.id === activeId && "active")}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      <div className="profile-area">
        <strong>{userName}</strong>
        <small>{userRole}</small>
      </div>
    </aside>
  );
}
