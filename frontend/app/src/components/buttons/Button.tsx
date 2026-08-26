import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared/classNames";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "default" | "small";
  loading?: boolean;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "default", loading, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button className={classNames("btn", variant, size === "small" && "small", className)} disabled={disabled || loading} {...props}>
      {loading && <span className={classNames("spinner", "mini", variant === "primary" || variant === "danger" ? "" : "dark")} aria-hidden="true" />}
      {children}
    </button>
  );
}
