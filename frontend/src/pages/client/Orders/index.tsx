
import { ChevronLeft, RefreshCw, ReceiptText, BellRing } from "lucide-react";

import { Button } from "@/components";
import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { formatPrice } from "@/utils/formatPrice";

import { useCallWaiter } from "./hooks/useCallWaiter";
import { useOrders } from "./hooks/useOrders";

import type { OrderStatus } from "@/services/orders.service";

import "./styles.scss";

type OrdersProps = {
  tableToken: string;
  onNavigate: (destination: string) => void;
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Recebido",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export function Orders({ tableToken, onNavigate }: OrdersProps) {
  const waiter = useCallWaiter(tableToken);
  const {
    orders,
    isLoading,
    error,
    refreshOrders,
  } = useOrders(tableToken);

  return (
    <div className="client-orders-page">
      <ClientTableHeader
        backAction={
          <button
            type="button"
            className="client-orders-back"
            aria-label="Voltar ao cardápio"
            onClick={() => onNavigate("menu")}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        }
      />

      <main
        className="client-orders-content"
        aria-labelledby="client-orders-title"
        aria-busy={isLoading}
      >
        <div className="client-orders-heading">
          <h1 id="client-orders-title">Meus pedidos</h1>

          <Button
            variant="secondary"
            onClick={refreshOrders}
            disabled={isLoading}
          >
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
        </div>

        <section className="client-orders-waiter" aria-label="Atendimento da mesa">
          <Button variant="secondary" onClick={waiter.handleCall} loading={waiter.isCalling} disabled={!tableToken || waiter.isCalling}>
            <BellRing aria-hidden="true" />
            Chamar garçom
          </Button>
          {waiter.success && <p role="status">Solicitação confirmada. Um garçom foi chamado para sua mesa.</p>}
          {waiter.error && <p role="alert">{waiter.error}</p>}
        </section>

        {isLoading ? (
          <p role="status">Carregando pedidos...</p>
        ) : error ? (
          <section className="client-orders-feedback" role="alert">
            <p>{error}</p>
            <Button onClick={refreshOrders}>
              Tentar novamente
            </Button>
          </section>
        ) : orders.length === 0 ? (
          <section className="client-orders-feedback" role="status">
            <ReceiptText aria-hidden="true" />

            <h2>Nenhum pedido encontrado</h2>

            <p>
              Os pedidos realizados nesta mesa
              aparecerão aqui.
            </p>

            <Button onClick={() => onNavigate("menu")}>
              Ver cardápio
            </Button>
          </section>
        ) : (
          <div className="client-orders-list">
            {orders.map((order) => {
              const total = order.items.reduce(
                (sum, item) =>
                  sum + Number(item.unitPrice) * item.quantity,
                0,
              );

              return (
                <article
                  key={order.id}
                  className="client-orders-card"
                >
                  <div className="client-orders-card-header">
                    <h2>Pedido #{order.id}</h2>

                    <span
                      className={`client-orders-status client-orders-status--${order.status.toLowerCase()}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </div>

                  {order.customerName && (
                    <p className="client-orders-customer">
                      Cliente: {order.customerName}
                    </p>
                  )}

                  <ul className="client-orders-items">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>
                            {item.quantity}x {item.productName}
                          </strong>

                          {item.notes && (
                            <p>Observação: {item.notes}</p>
                          )}
                        </div>

                        <span>
                          {formatPrice(
                            Number(item.unitPrice) * item.quantity,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="client-orders-total">
                    <span>Total do pedido</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <ClientTabBar
        activeId="orders"
        onMenu={() => onNavigate("menu")}
        onOrder={() => onNavigate("order")}
        onNavigate={onNavigate}
      />
    </div>
  );
}
