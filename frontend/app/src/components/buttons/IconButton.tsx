import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared/classNames";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children: ReactNode;
  loading?: boolean;
};

export function IconButton({ label, children, loading, disabled, className, ...props }: IconButtonProps) {
  return <button className={classNames("icon-btn", className)} aria-label={label} disabled={disabled || loading} {...props}>
    {loading ? <span className="spinner mini dark" aria-hidden="true" /> : children}
  </button>;
}
