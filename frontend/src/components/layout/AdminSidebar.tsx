import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import { getSession, signOut } from "@/services/auth.service";
import {
  LayoutDashboard,
  ChartColumnBig,
  NotebookPen,
  Armchair,
  NotepadText,
  ExternalLink,
  LogOut,
  Settings,
  UserRound,
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
  userName?: string;
  userRole?: string;
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
  const user = getSession()?.user;
  userName ??= user?.name ?? "Usuário";
  userRole ??= user?.role === "ADMIN" ? "Administrador" : "Funcionário";
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    profileRef.current?.querySelector<HTMLElement>(".admin-profile-menu-item")?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

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
      {/* Prévia do cardápio na mesma aba; o "Voltar" dela retorna ao painel. */}
      <button type="button" onClick={() => onChange("menuPreview")}>
        <ExternalLink size={20} />
        <span>Ver cardápio</span>
      </button>
      {/* Disclosure (não menu ARIA): Tab percorre os itens e, ao sair, fecha. */}
      <div
        className="admin-profile"
        ref={profileRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }}
      >
        <div id={menuId} className="admin-profile-menu" hidden={!menuOpen}>
          <button
            type="button"
            className="admin-profile-menu-item"
            onClick={() => {
              setMenuOpen(false);
              onChange("settings");
            }}
          >
            <Settings size={18} aria-hidden="true" />
            <span>Configurações</span>
          </button>
          <button
            type="button"
            className="admin-profile-menu-item"
            onClick={signOut}
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
        <button
          ref={triggerRef}
          type="button"
          className="profile-area"
          aria-controls={menuId}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <UserRound className="admin-profile-icon" size={20} aria-hidden="true" />
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
        </button>
      </div>
    </aside>
  );
}
