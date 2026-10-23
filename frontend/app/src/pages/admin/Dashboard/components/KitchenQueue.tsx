import { Eye, List } from "lucide-react";
import { Badge, Button } from "@/components";

import { orders } from "../mocks/dashboard.mock";

type KitchenQueueProps = {
  onViewOrder?: (orderId: number) => void;
  onViewOrders?: () => void;
};

export function KitchenQueue({ onViewOrders, onViewOrder }: KitchenQueueProps) {
  return (
    <section
      className="mf-dashboard-panel"
      aria-labelledby="kitchen-title"
    >
      <div className="mf-dashboard-panel-heading">
        <div>
          <h2 id="kitchen-title">Fila de pedidos</h2>
          <p>Acompanhe os próximos pedidos da cozinha.</p>
        </div>

        <Button type="button" variant="ghost" size="small" className="mf-dashboard-view-action" onClick={onViewOrders}>
          <Eye aria-hidden="true" />
          Ver todos
        </Button>
      </div>

      <div className="mf-dashboard-orders">
        {orders.map((order) => (
          <article
            className="mf-dashboard-order"
            key={order.id}
          >
            <span className="mf-dashboard-order-icon"><List aria-hidden="true" size={24} /></span>
            <div className="mf-dashboard-order-description">
              <h3>Pedido #{order.id}</h3>
              <p>{order.description}</p>
            </div>

            <Badge
              variant={order.tone === "blue" ? "prep" : "wait"}
            >
              {order.status}
            </Badge>
            <Button type="button" variant="secondary" size="small" className="mf-dashboard-order-view" aria-label={`Visualizar pedido #${order.id}`} onClick={() => onViewOrder?.(order.id)}>
              <Eye aria-hidden="true" />
              <span>Ver pedido</span>
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}