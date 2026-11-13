import { ClientTableHeader } from "@/components/layout/ClientTableHeader";
import { Check, ChevronLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { useCart } from "@/contexts/useCart";
import { OrderReviewCard } from "./components/OrderReviewCard";
import { useConfirmOrder } from "./hooks/useConfirmOrder";
import "./styles.scss";

type ConfirmOrderProps = {
  tableToken: string;
  customerName: string;
  onBack: () => void;
  onGoToMenu: () => void;
  onNavigate: (destination: string) => void;
};

export function ConfirmOrder({ tableToken, customerName, onBack, onGoToMenu, onNavigate }: ConfirmOrderProps) {
  const { items, itemCount, total } = useCart();
  const {
    handleSendOrder,
    isSubmitting,
    orderId,
    error,
  } = useConfirmOrder(tableToken, customerName);
  return <div className="confirm-order-page">
    <ClientTableHeader  
      backAction={<button type="button" className="confirm-order-back" aria-label="Voltar ao carrinho" onClick={onBack}><ChevronLeft aria-hidden="true" /></button>}
      cartAction={<button type="button" className="confirm-order-cart" aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} onClick={onBack}>
        <ShoppingCart aria-hidden="true" /><span aria-hidden="true">{itemCount}</span>
      </button>} />
    <main className="confirm-order-content">
      {orderId !== null ? (
        <section className="confirm-order-feedback" role="status">
          <Check aria-hidden="true" />
            <h1>Pedido #{orderId} registrado.</h1>
            <p>  
              Seu pedido foi enviado com sucesso.
              Você já pode realizar novos pedidos nesta mesa.
            </p>
            <Button variant="secondary" onClick={onGoToMenu}>
              Voltar ao cardápio
            </Button>
        </section> 
      ): items.length ? <>
        <p className="confirm-order-kicker">Revisão</p>
        <h1>Confirme antes de enviar.</h1>

        <OrderReviewCard items={items} total={total} />

        <div className="confirm-order-actions">
          <Button onClick={handleSendOrder}>
            Enviar pedido
          </Button>
          <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>
            Editar carrinho
          </Button>
        </div>

        {error && (
          <p className="confirm-order-error" role="alert">
            {error}
          </p>
        )}
      </> : 
        <section className="confirm-order-feedback">
          <h1>Seu carrinho está vazio.</h1>
          <p>Adicione um item ao pedido para revisar.</p>
          <Button onClick={onGoToMenu}>
            Explorar cardápio
          </Button>
        </section>
      }
    </main>
    <ClientTabBar activeId="order" onMenu={onGoToMenu} onOrder={onBack} onNavigate={onNavigate} />
  </div>;
}
