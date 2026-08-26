import type { SelectHTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string };

export function SelectField({ label, error, hint, disabled, className, id, children, ...props }: SelectFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return <label className={classNames("field", error && "error", disabled && "disabled", className)} htmlFor={fieldId}>
    <span>{label}</span><select id={fieldId} disabled={disabled} aria-invalid={Boolean(error)} {...props}>{children}</select>
    {(error || hint) && <small>{error ?? hint}</small>}
  </label>;
}
