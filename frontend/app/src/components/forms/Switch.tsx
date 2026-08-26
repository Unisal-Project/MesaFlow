import type { InputHTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };
export function Switch({ label, disabled, className, ...props }: SwitchProps) {
  return <label className={classNames("switch-control", disabled && "disabled", className)}><input type="checkbox" disabled={disabled} {...props} /><span aria-hidden="true" /> {label}</label>;
}
