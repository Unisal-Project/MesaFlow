import type { ReactNode } from "react";
import { classNames } from "@/utils/classNames";

type NavigationItem = { id: string; label: string; icon?: ReactNode };
type BottomNavigationProps = {
  className?: string;
  items: NavigationItem[];
  activeId: string;
  onChange: (id: string) => void;
};

export function BottomNavigation({
  className,
  items,
  activeId,
  onChange,
}: BottomNavigationProps) {
  return (
    <nav
      className={classNames("bottom-nav", className)}
      aria-label="Navegação principal"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={classNames(item.id === activeId && "active")}
          aria-current={item.id === activeId ? "page" : undefined}
          onClick={() => onChange(item.id)}
        >
          {item.icon ? (
            <>
              {item.icon}
              <span>{item.label}</span>
            </>
          ) : (
            item.label
          )}
        </button>
      ))}
    </nav>
  );
}
