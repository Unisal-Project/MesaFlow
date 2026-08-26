import { classNames } from "../shared/classNames";
type NavigationItem = { id: string; label: string };
type BottomNavigationProps = { items: NavigationItem[]; activeId: string; onChange: (id: string) => void };
export function BottomNavigation({ items, activeId, onChange }: BottomNavigationProps) {
  return <nav className="bottom-nav" aria-label="Navegação principal">{items.map((item) => <button key={item.id} type="button" className={classNames(item.id === activeId && "active")} aria-current={item.id === activeId ? "page" : undefined} onClick={() => onChange(item.id)}>{item.label}</button>)}</nav>;
}
