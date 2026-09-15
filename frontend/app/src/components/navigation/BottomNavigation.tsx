import type { ReactNode } from "react";
import { classNames } from "../shared/classNames";

type NavigationItem = { id: string; label: string; icon?: ReactNode };
type BottomNavigationProps = { items: NavigationItem[]; activeId: string; onChange: (id: string) => void };

export function BottomNavigation({ items, activeId, onChange }: BottomNavigationProps) {
  return <nav className="bottom-nav" aria-label="Navegação principal">
    {items.map((item) => 
      <button key={item.id} type="button" className={
        classNames(item.id === activeId && "active")
      } 
      aria-current={item.id === activeId ? "page" : undefined} 
      onClick={() => onChange(item.id)}>
        {item.icon ? <>{item.icon}<span>{item.label}</span></> : item.label}</button>
    )}
  </nav>;
}
