import type { ReactNode } from "react";
type StatCardProps = { label: string; value: string; trend?: string; icon?: ReactNode };
export function StatCard({ label, value, trend, icon }: StatCardProps) {
  return <article className="stat-card">{icon && <div className="stat-icon">{icon}</div>}<span>{label}</span><strong>{value}</strong>{trend && <p>{trend}</p>}</article>;
}
