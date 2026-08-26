import type { ReactNode } from "react";
import { classNames } from "../shared/classNames";
type ToastProps = { children: ReactNode; variant?: "success" | "error" | "info"; visible: boolean };
export function Toast({ children, variant = "success", visible }: ToastProps) {
  if (!visible) return null;
  return <div className={classNames("toast", variant)} role="status">{children}</div>;
}
