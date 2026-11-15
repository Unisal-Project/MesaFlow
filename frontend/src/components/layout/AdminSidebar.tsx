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
  BadgePercent,
  LogOut,
  Settings,
  UserRound,
  Menu,
  X,
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
    id: "promotions",
    label: "Promoções",
    icon: <BadgePercent size={20} />,
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
  const drawerId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => {
    setDrawerOpen(false);
    setMenuOpen(false);
    drawerTriggerRef.current?.focus();
  };
  const navigate = (id: string) => {
    if (drawerOpen) closeDrawer();
    onChange(id);
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const drawer = drawerRef.current;
    const syncViewport = () => {
      if (drawer) drawer.inert = media.matches && !drawerOpen;
      if (!media.matches) setDrawerOpen(false);
    };
    syncViewport();
    media.addEventListener("change", syncViewport);
    if (!drawerOpen) return () => media.removeEventListener("change", syncViewport);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        setMenuOpen(false);
        drawerTriggerRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(drawerRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])
        .filter((button) => button.getClientRects().length > 0 && !button.disabled);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawerRef.current)) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", syncViewport);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    profileRef.current?.querySelector<HTMLElement>(".admin-profile-menu-item")?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || drawerOpen) return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, drawerOpen]);

  return (
    <>
      <button ref={drawerTriggerRef} type="button" className="admin-menu-trigger"
        aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls={drawerId}
        onClick={() => setDrawerOpen(true)}><Menu size={24} aria-hidden="true" /></button>
      <div className={classNames("admin-sidebar-backdrop", drawerOpen && "is-open")} onClick={closeDrawer} aria-hidden="true" />
      <aside ref={drawerRef} id={drawerId} className={classNames("admin-sidebar", drawerOpen && "is-open")}
        role={drawerOpen ? "dialog" : undefined} aria-modal={drawerOpen || undefined}
        aria-label="Menu administrativo" tabIndex={-1}>
      <button type="button" className="admin-menu-close" aria-label="Fechar menu" onClick={closeDrawer}>
        <X size={24} aria-hidden="true" />
      </button>
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
          onClick={() => navigate(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
      {/* Prévia do cardápio na mesma aba; o "Voltar" dela retorna ao painel. */}
      <button type="button" onClick={() => navigate("menuPreview")}>
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
              navigate("settings");
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
    </>
  );
}
