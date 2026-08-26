import type { InputHTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };
export function Radio({ label, disabled, className, ...props }: RadioProps) {
  return <label className={classNames("radio-control", disabled && "disabled", className)}><input type="radio" disabled={disabled} {...props} /><span aria-hidden="true" /> {label}</label>;
}
