import type { ReactNode } from "react";
type BreadcrumbHeaderProps = { title: string; subtitle: string; actions?: ReactNode };
export function BreadcrumbHeader({ title, subtitle, actions }: BreadcrumbHeaderProps) {
  return <header className="admin-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{actions}</header>;
}
