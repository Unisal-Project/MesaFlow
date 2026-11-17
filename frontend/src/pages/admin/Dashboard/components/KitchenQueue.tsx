import { Eye, List } from "lucide-react";
import { Button } from "@/components";

import type { Order } from "../../Order/types/order.types";
import { currentBusinessDate, orderNumber } from "../../Order/utils/order.utils";

const describe = (order: Order) =>
  `${order.table} · ${order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}`;

type KitchenQueueProps = {
  orders: Order[];
  onViewOrder?: (orderId: number) => void;
  onViewOrders?: () => void;
};

export function KitchenQueue({ orders, onViewOrders, onViewOrder }: KitchenQueueProps) {
  const today = currentBusinessDate(orders);
  return (
    <section
      className="mf-dashboard-panel"
      aria-labelledby="kitchen-title"
    >
      <div className="mf-dashboard-panel-heading">
        <div>
          <h2 id="kitchen-title">Fila de pedidos</h2>
          <p>Consulte os pedidos registrados.</p>
        </div>

        <Button type="button" variant="ghost" size="small" className="mf-dashboard-view-action" onClick={onViewOrders}>
          <Eye aria-hidden="true" />
          Ver todos
        </Button>
      </div>

      <div className="mf-dashboard-orders">
        {orders.map((order) => (
          // A linha inteira abre o pedido; o olho fica só como indicação visual
          // (botão dentro de botão não é válido).
          <button
            type="button"
            className="mf-dashboard-order"
            key={order.id}
            aria-label={`Visualizar pedido ${orderNumber(order, today)}: ${describe(order)}`}
            onClick={() => onViewOrder?.(order.id)}
          >
            <span className="mf-dashboard-order-icon"><List aria-hidden="true" size={24} /></span>
            <span className="mf-dashboard-order-description">
              <strong className="mf-dashboard-order-title">Pedido {orderNumber(order, today)}</strong>
              <span className="mf-dashboard-order-meta">{describe(order)}</span>
            </span>

            <span className="btn secondary small mf-dashboard-order-view" aria-hidden="true">
              <Eye aria-hidden="true" />
              <span>Ver pedido</span>
            </span>
          </button>
        ))}
        {orders.length === 0 && <p>Nenhum pedido em aberto agora.</p>}
      </div>
    </section>
  );
}