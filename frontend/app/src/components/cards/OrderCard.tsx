import { Badge, type BadgeVariant } from "../status";
type OrderCardProps = { id: string; description: string; total: string; status: { label: string; variant: BadgeVariant }; onClick?: () => void };
export function OrderCard({ id, description, total, status, onClick }: OrderCardProps) {
  return <article className="order-card" onClick={onClick}><div className="card-title-row"><h3>Pedido {id}</h3><Badge variant={status.variant}>{status.label}</Badge></div><p>{description}</p><strong>{total}</strong></article>;
}
