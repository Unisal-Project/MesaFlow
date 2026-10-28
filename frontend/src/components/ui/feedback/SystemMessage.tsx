import type { ReactNode } from "react";
import { classNames } from "@/utils/classNames";
type SystemMessageProps = { children: ReactNode; variant: "success" | "error" | "info" | "warning" };
export function SystemMessage({ children, variant }: SystemMessageProps) {
  return <div className={classNames("message", variant)} role="status">{children}</div>;
}
