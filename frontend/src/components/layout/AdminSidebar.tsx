import type { ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import {
  LayoutDashboard,
  ChartColumnBig,
  NotebookPen,
  Armchair,
  NotepadText,
} from "lucide-react";

export type SidebarItem = { id: string; label: string; icon?: ReactNode };

const adminSidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  {
    id: "orders",
    label: "Pedidos",
    icon: <NotepadText size={20} />,
  },
  {
    id: "tables",
    label: "Mesas",
    icon: <Armchair size={20} />,
  },
  {
    id: "menu",
    label: "Cardápio",
    icon: <NotebookPen size={20} />,
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: <ChartColumnBig size={20} />,
  },
];

type AdminSidebarProps = {
  brand?: string;
  brandSubtitle?: string;
  navigationLabel?: string;
  showAvatar?: boolean;
  brandImage?: ReactNode;
  items?: SidebarItem[];
  activeId: string;
  onChange: (id: string) => void;
  userName: string;
  userRole: string;
};
export function AdminSidebar({
  brand = "MesaFlow",
  brandSubtitle = "Administrativo",
  navigationLabel,
  showAvatar = false,
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
          <small>{brandSubtitle}</small>
        </div>
      </div>
      {navigationLabel && (
        <p className="admin-navigation-label">{navigationLabel}</p>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={classNames(item.id === activeId && "active")}
          aria-current={item.id === activeId ? "page" : undefined}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
      <div className="profile-area">
        {showAvatar && (
          <span className="admin-profile-avatar" aria-hidden="true">
            {userName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
        <strong>{userName}</strong>
        <small>{userRole}</small>
      </div>
    </aside>
  );
}
