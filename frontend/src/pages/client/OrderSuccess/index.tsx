import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { Check, ChevronLeft } from "lucide-react";
import { Button, IconButton } from "@/components";

import { ClientTabBar } from "@/components/layout/ClientTabBar";

import type { OrderSuccessProps } from "./types/orderSuccess.types";

import "./styles.scss";

export function OrderSuccess({ onBack, onNavigate }: OrderSuccessProps) {
  function handleNavigate(destination: string) {
    onNavigate?.(destination);
  }

  return (
    <div className="order-success-page">
      <ClientTableHeader
        backAction={
          <IconButton type="button" label="Voltar" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </IconButton>
        }
      />

      <main className="order-success-main" aria-labelledby="order-success-title">
        <div className="order-success-content">
          <div className="order-success-icon" aria-hidden="true">
            <Check />
          </div>
          <p className="order-success-eyebrow">PEDIDO ENVIADO</p>
          <h1 id="order-success-title">Recebemos seu pedido.</h1>
          <p className="order-success-description">
            Seu pedido foi registrado.
          </p>
          <div className="order-success-actions">
            <Button type="button" variant="primary" onClick={() => handleNavigate("bill")}>
              Ver conta
            </Button>
            <Button type="button" variant="ghost" onClick={() => handleNavigate("menu")}>
              Pedir mais itens
            </Button>
          </div>
        </div>
      </main>

      <ClientTabBar activeId="orders" onMenu={() => handleNavigate("menu")} onOrder={() => handleNavigate("order")} onNavigate={handleNavigate} />
    </div>
  );
}
