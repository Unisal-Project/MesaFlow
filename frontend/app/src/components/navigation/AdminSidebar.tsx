import type { ReactNode } from "react";
import { classNames } from "../shared/classNames";
type SidebarItem = { id: string; label: string; icon?: ReactNode };
type AdminSidebarProps = { brand: string; items: SidebarItem[]; activeId: string; onChange: (id: string) => void; profile?: ReactNode };
export function AdminSidebar({ brand, items, activeId, onChange, profile }: AdminSidebarProps) {
  return <aside className="admin-sidebar"><div className="admin-brand">{brand}</div>{items.map((item) => <button key={item.id} type="button" className={classNames(item.id === activeId && "active")} onClick={() => onChange(item.id)}>{item.icon}{item.label}</button>)}{profile && <div className="profile-area">{profile}</div>}</aside>;
}
