import type { ReactNode } from "react";
type EmptyStateProps = { title: string; description: string; icon?: ReactNode; action?: ReactNode };
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return <div className="empty-state">{icon}<h3>{title}</h3><p>{description}</p>{action}</div>;
}
