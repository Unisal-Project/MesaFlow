import type { HTMLAttributes } from "react";
import { classNames } from "../shared/classNames";

export type BadgeVariant = "wait" | "prep" | "ready" | "delivered" | "canceled" | "paid" | "open" | "closed" | "occupied" | "free" | "success" | "warning" | "error" | "info";
type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant: BadgeVariant };
export function Badge({ variant, className, children, ...props }: BadgeProps) {
  return <span className={classNames("badge", variant, className)} {...props}>{children}</span>;
}
