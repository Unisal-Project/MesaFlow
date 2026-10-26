import { ChevronLeft, ShoppingCart } from "lucide-react";

import { Button, ClientHeader, OrderProgress } from "@/components";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { orderSteps, statusMessages } from "./constants/orderTracking.constants";

import { mockOrderTracking } from "./mocks/orderTracking.mocks";

import type { OrderTrackingProps } from "./types/orderTracking.types";

import "./styles.scss";

export function OrderTracking({ order = mockOrderTracking, onBack, onNavigate }: OrderTrackingProps) {
  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;

  function handleNavigate(destination: string) {
    onNavigate?.(destination);
  }

  return (
    <div className="order-tracking-page">
      <ClientHeader
        title="MesaFlow"
        subtitle={tableLabel}
        backAction={
          <button type="button" className="order-tracking-back" aria-label="Voltar" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </button>
        }
        cartAction={
          <button
            className="order-tracking-cart"
            type="button"
            aria-label={`Carrinho, ${order.cartItemCount} ${order.cartItemCount === 1 ? "item" : "itens"}`}
            onClick={() => handleNavigate("order")}
          >
            <ShoppingCart aria-hidden="true" />
            <span aria-hidden="true">
              {order.cartItemCount}
            </span>
          </button>
        }
      />

      <main className="order-tracking-main" aria-labelledby="order-tracking-title">
        <p className="order-tracking-eyebrow">ACOMPANHAMENTO</p>
        <h1 id="order-tracking-title">Pedido #{order.id}</h1>
        <p className="order-tracking-description" role="status">
          {statusMessages[order.status]}
        </p>

        <OrderProgress steps={orderSteps} currentId={order.status} />

        <div className="order-tracking-actions">
          <Button type="button" variant="secondary" onClick={() => handleNavigate("menu")}>
            Adicionar mais itens
          </Button>
          <Button type="button" variant="primary" onClick={() => handleNavigate("bill")}>
            Ver conta
          </Button>
        </div>
      </main>

      <ClientTabBar activeId="status" onMenu={() => handleNavigate("menu")}
        onOrder={() => handleNavigate("order")} onNavigate={handleNavigate} />
    </div>
  );
}
