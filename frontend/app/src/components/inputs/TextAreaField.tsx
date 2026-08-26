import type { TextareaHTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string };

export function TextAreaField({ label, error, hint, disabled, className, id, ...props }: TextAreaFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return <label className={classNames("field", error && "error", disabled && "disabled", className)} htmlFor={fieldId}>
    <span>{label}</span><textarea id={fieldId} disabled={disabled} aria-invalid={Boolean(error)} {...props} />
    {(error || hint) && <small>{error ?? hint}</small>}
  </label>;
}
