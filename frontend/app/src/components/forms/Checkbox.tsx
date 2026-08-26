import type { InputHTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };
export function Checkbox({ label, disabled, className, ...props }: CheckboxProps) {
  return <label className={classNames("check-control", disabled && "disabled", className)}><input type="checkbox" disabled={disabled} {...props} /><span aria-hidden="true" /> {label}</label>;
}
