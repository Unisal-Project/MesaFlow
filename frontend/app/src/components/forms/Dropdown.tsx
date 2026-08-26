import { useId, useState } from "react";
import { classNames } from "../shared/classNames";

export type DropdownOption = { value: string; label: string; disabled?: boolean };
type DropdownProps = { label: string; options: DropdownOption[]; value: string; onChange: (value: string) => void };
export function Dropdown({ label, options, value, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const selected = options.find((option) => option.value === value);
  return <div><button type="button" className="dropdown-trigger" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>{label}<span>{selected?.label}</span></button>{open && <div id={menuId} className="dropdown-menu" role="menu">{options.map((option) => <button key={option.value} type="button" role="menuitem" disabled={option.disabled} className={classNames(option.value === value && "active")} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}</div>}</div>;
}
