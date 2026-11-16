import { useState } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router";

import { ChevronLeft } from "lucide-react";
import { EmptyState, SystemMessage } from "@/components";
import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { CartProvider } from "@/contexts/CartProvider";
import { Cart } from "@/pages/client/Cart";
import "@/pages/client/TableBill/styles.scss";
import { PREVIEW_CART_KEY, previewTarget, resetPreviewCart } from "./preview";

import "./styles.scss";

/**
 * Grupo /admin/ver-cardapio: um carrinho isolado para cardápio, detalhe,
 * carrinho e conta. Zera só ao entrar (o layout continua montado entre as abas).
 */
export function PreviewLayout() {
  // Antes do CartProvider ler o armazenamento; roda uma vez por entrada.
  useState(resetPreviewCart);
  return (
    <CartProvider storageKey={PREVIEW_CART_KEY}>
      <Outlet />
    </CartProvider>
  );
}

/** Navegação das abas do cliente dentro da prévia (mantém a origem). */
function usePreviewNavigate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  return (destination: string) =>
    navigate(previewTarget(destination, searchParams));
}

/** Carrinho do cliente; "Continuar" só avisa — nada é enviado. */
export function CartPreview() {
  const go = usePreviewNavigate();
  const [blocked, setBlocked] = useState(false);
  return (
    <>
      <Cart
        allowOrdering={false}
        onReview={() => setBlocked(true)}
        onNavigate={go}
        onBack={() => go("menu")}
        onGoToMenu={() => go("menu")}
        onOrderConfirmed={() => go("menu")}
      />
      {blocked && (
        <div className="menu-preview-notice">
          <SystemMessage variant="warning">
            Admin não pode realizar pedido
          </SystemMessage>
        </div>
      )}
    </>
  );
}

/** A conta só existe ao entrar pelo QR de uma mesa. */
export function BillPreview() {
  const go = usePreviewNavigate();
  return (
    <div className="table-bill-page">
      <ClientTableHeader
        backAction={
          <button
            type="button"
            className="table-bill-back"
            aria-label="Voltar"
            onClick={() => go("menu")}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        }
      />
      <main className="table-bill-main">
        <div className="table-bill-heading">
          <h1>Conta da mesa</h1>
        </div>
        <section className="table-bill-summary">
          <EmptyState
            title="Prévia sem mesa"
            description="A conta aparece quando o cliente entra pelo QR da mesa."
          />
        </section>
      </main>
      <ClientTabBar
        activeId="bill"
        onMenu={() => go("menu")}
        onOrder={() => go("order")}
        onNavigate={go}
      />
    </div>
  );
}
