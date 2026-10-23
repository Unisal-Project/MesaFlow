import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { ChevronLeft, ShoppingCart } from "lucide-react";

import { ClientHeader, Button } from "@/components";
import { CartItem } from "./components/CartItem";
import { CartSummary } from "./components/CartSummary";

import { useCartOrder } from "./hooks/useCartOrder";

import type { CartPageProps } from "./types/cart.types";

import "./styles.scss";

export function Cart({ onBack, onGoToMenu, onOrderConfirmed, allowOrdering = true, onReview, onNavigate }: CartPageProps) {
  const {
    items,
    itemCount,
    subtotal,
    serviceFee,
    total,
    removeItem,
    updateQuantity,
    updateNotes,
    splitLine,
    isSubmitting,
    error,
    orderPlaced,
    handleConfirm,
  } = useCartOrder(allowOrdering);

  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;

  return (
    <div className="cart-page">
      <ClientHeader title="MesaFlow" subtitle={tableLabel}
        backAction={<button type="button" className="cart-back" aria-label="Voltar" onClick={onBack}><ChevronLeft aria-hidden="true" /></button>}
        cartAction={<button type="button" className="cart-header-count" aria-label={`Pedido com ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ShoppingCart aria-hidden="true" /><span aria-hidden="true">{itemCount}</span>
        </button>} />

      <main className="cart-content">
        {orderPlaced ? (
          <div className="empty-cart">
            <ShoppingCart aria-hidden="true" />
            <strong>Pedido enviado com sucesso!</strong>
            <p>Acompanhe o andamento na aba "Status".</p>
            <Button variant="secondary" onClick={onOrderConfirmed}>Voltar ao cardápio</Button>
          </div>
        ) : (
          <>
            <div className="cart-title-row">
              <h1>Seu pedido</h1>
              <span>{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
            </div>

            {items.length === 0 ? (
              <div className="empty-cart">
                <ShoppingCart aria-hidden="true" />
                <strong>Seu carrinho está vazio.</strong>
                <p>Escolha seus itens favoritos no cardápio.</p>
                <Button variant="secondary" onClick={onGoToMenu}>Ver cardápio</Button>
              </div>
            ) : (
              <>
                <ul className="cart-list">
                  {items.map((line) => {
                    const quantityReservedElsewhere = items
                      .filter(
                        (other) =>
                          other.id !== line.id &&
                          other.product.id === line.product.id
                      )
                      .reduce(
                        (sum, other) => sum + other.quantity,
                        0
                      );

                    const maxQuantity = Math.max(
                      line.quantity,
                      line.product.stockQuantity - quantityReservedElsewhere
                    );

                    return (
                      <CartItem
                        key={line.id}
                        line={line}
                        maxQuantity={maxQuantity}
                        onUpdateQuantity={updateQuantity}
                        onUpdateNotes={updateNotes}
                        onSplitLine={splitLine}
                        onRemove={removeItem}
                      />
                    );
                  })}
                </ul>

                <CartSummary
                  subtotal={subtotal}
                  serviceFee={serviceFee}
                  total={total}
                >
                  {error && <p className="cart-error" role="alert">{error}</p>}
                  <Button className="continue-button" onClick={onReview ?? handleConfirm} loading={isSubmitting} disabled={!allowOrdering && !onReview}>Continuar</Button>
                  {!allowOrdering && !onReview && <p className="cart-ordering-note" role="status">Pedidos pelo QR Code ainda não estão disponíveis. Solicite ao atendente.</p>}
                </CartSummary>
              </>
            )}
          </>
        )}
      </main>

      <ClientTabBar activeId="order" onMenu={onGoToMenu} onOrder={() => window.scrollTo({ top: 0, behavior: "smooth" })} onNavigate={onNavigate} />
    </div>
  );
}