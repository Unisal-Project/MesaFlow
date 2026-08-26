import { classNames } from "../shared/classNames";

export type TabItem = { id: string; label: string; disabled?: boolean };
type TabsProps = { items: TabItem[]; activeId: string; onChange: (id: string) => void; ariaLabel: string };
export function Tabs({ items, activeId, onChange, ariaLabel }: TabsProps) {
  return <div className="tabs" role="tablist" aria-label={ariaLabel}>{items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={item.id === activeId} className={classNames(item.id === activeId && "active")} disabled={item.disabled} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>;
}
