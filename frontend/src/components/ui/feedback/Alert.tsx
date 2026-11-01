import type { ReactNode } from "react";
import { classNames } from "@/utils/classNames";
type AlertProps = { children: ReactNode; variant?: "success" | "error" | "info" | "warning" };
export function Alert({ children, variant = "info" }: AlertProps) {
  return <div className={classNames("alert", variant)} role="alert">{children}</div>;
}
