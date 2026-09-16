import { useState } from "react";
import { ChevronLeft, ShoppingCart, Menu as MenuIcon, Clock, ReceiptText } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { QuantitySelector, Button } from "@/components";
import { createOrder, CURRENT_ATTENDANCE_ID } from "@/_services/orders.service";
import "./styles.css";

type CartPageProps = {
  onBack: () => void;
  onGoToMenu: () => void;
  onOrderConfirmed: () => void;
};

function formatPrice(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function Cart({ onBack, onGoToMenu, onOrderConfirmed }: CartPageProps) {
 const { items, itemCount, subtotal, serviceFee, total, removeItem, updateQuantity, updateNotes, splitLine, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    try {
      await createOrder({
        attendanceId: CURRENT_ATTENDANCE_ID,
        items: items.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          notes: line.notes || undefined,
        })),
      });

      clearCart();
      setOrderPlaced(true);
    } catch {
      setError("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="cart-page">
      <header className="cart-header">
        <button type="button" className="icon-button" aria-label="Voltar" onClick={onBack}>
          <ChevronLeft />
        </button>

        <div>
          <strong>MesaFlow</strong>
          <span>Seu pedido</span>
        </div>

        <button type="button" className="icon-button cart-button" aria-label="Carrinho">
          <ShoppingCart />
          <b>{itemCount}</b>
        </button>
      </header>

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
                    const unitPrice = Number(line.product.price);
                    const lineSubtotal = unitPrice * line.quantity;

                    const quantityReservedElsewhere = items
                      .filter((other) => other.id !== line.id && other.product.id === line.product.id)
                      .reduce((sum, other) => sum + other.quantity, 0);
                    const maxQuantity = Math.max(
                      line.quantity,
                      line.product.stockQuantity - quantityReservedElsewhere
                    );

                    return (
                      <li key={line.id} className="cart-line">
                        {line.product.imageUrl ? (
                          <img src={line.product.imageUrl} alt={line.product.name} />
                        ) : (
                          <div className="thumb" aria-hidden="true" />
                        )}

                        <div className="cart-line-body">
                          <div className="cart-line-top">
                            <strong>{line.product.name}</strong>
                          </div>

                          <textarea
                            className="cart-line-notes-input"
                            placeholder="Sem observações"
                            value={line.notes}
                            onChange={(event) => updateNotes(line.id, event.target.value)}
                            rows={1}
                          />
                            {line.quantity > 1 && (
                                    <button type="button" className="split-line-button" onClick={() => splitLine(line.id)}>
                                      Usar observação diferente pra cada um
                                    </button>
                                  )}
                                  
                          <div className="cart-line-row">
                            <QuantitySelector
                              value={line.quantity}
                              onChange={(quantity) => updateQuantity(line.id, quantity)}
                              min={1}
                              max={maxQuantity}
                            />
                            <button type="button" className="remove-button" onClick={() => removeItem(line.id)}>
                              Remover
                            </button>
                          </div>

                          <div className="cart-line-row">
                            <span className="unit-price">{formatPrice(unitPrice)} cada</span>
                            <strong className="line-subtotal">{formatPrice(lineSubtotal)}</strong>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Taxa de serviço</span>
                    <strong>{formatPrice(serviceFee)}</strong>
                  </div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                </div>

                {error && <p className="cart-error">{error}</p>}

                <Button className="continue-button" onClick={handleConfirm} loading={isSubmitting}>
                  Continuar
                </Button>
              </>
            )}
          </>
        )}
      </main>

      <nav className="bottom-navigation" aria-label="Navegação principal">
        <button type="button" onClick={onGoToMenu}><MenuIcon /><span>Cardápio</span></button>
        <button type="button" className="active"><ShoppingCart /><span>Pedido</span></button>
        <button type="button"><Clock /><span>Status</span></button>
        <button type="button"><ReceiptText /><span>Conta</span></button>
      </nav>
    </div>
  );
}