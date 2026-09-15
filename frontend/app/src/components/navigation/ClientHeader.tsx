import type { ReactNode } from "react";
type ClientHeaderProps = {
  title: string;
  subtitle?: string;
  backAction?: ReactNode;
  cartAction?: ReactNode;
};

export function ClientHeader({ title, subtitle, backAction, cartAction }: ClientHeaderProps) {
  return (
    <header className="client-header">
      {backAction ?? <span />}
      {subtitle ? (
        <div className="client-header-heading">
          <strong>{title}</strong>
          <span className="client-header-subtitle">{subtitle}</span>
        </div>
      ) : (
        <strong>{title}</strong>
      )}
      {cartAction ?? <span />}
    </header>
  );
}
