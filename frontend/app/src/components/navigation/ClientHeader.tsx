import type { ReactNode } from "react";
type ClientHeaderProps = { title: string; backAction?: ReactNode; cartAction?: ReactNode };
export function ClientHeader({ title, backAction, cartAction }: ClientHeaderProps) {
  return <header className="client-header">{backAction ?? <span /> }<strong>{title}</strong>{cartAction ?? <span />}</header>;
}
