import type { ReactNode } from "react";
import { Button } from "../buttons";
import { classNames } from "../shared/classNames";

type ConfirmationDialogProps = { title: string; description: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; cancelLabel?: string; variant?: "default" | "danger"; open: boolean; children?: ReactNode };
export function ConfirmationDialog({ title, description, confirmLabel, onConfirm, onCancel, cancelLabel = "Voltar", variant = "default", open, children }: ConfirmationDialogProps) {
  if (!open) return null;
  return <div className={classNames("modal", variant === "danger" && "danger-modal")} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h3 id="dialog-title">{title}</h3><p>{description}</p>{children}<div><Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button><Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></div></div>;
}
