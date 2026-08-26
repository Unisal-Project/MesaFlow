import type { InputHTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, disabled, className, id, ...props }: TextFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return <label className={classNames("field", error && "error", disabled && "disabled", className)} htmlFor={fieldId}>
    <span>{label}</span>
    <input id={fieldId} disabled={disabled} aria-invalid={Boolean(error)} {...props} />
    {(error || hint) && <small>{error ?? hint}</small>}
  </label>;
}
