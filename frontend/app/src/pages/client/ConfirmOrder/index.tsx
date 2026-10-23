import { Check, ChevronLeft, ShoppingCart } from "lucide-react";
import { Button, ClientHeader, Switch } from "@/components";
import { ClientTabBar } from "@/components/layout/ClientTabBar";
import { useCart } from "@/contexts/useCart";
import { OrderReviewCard } from "./components/OrderReviewCard";
import { useConfirmOrder } from "./hooks/useConfirmOrder";
import "./styles.scss";

type ConfirmOrderProps = {
  orderId: number;
  onBack: () => void;
  onGoToMenu: () => void;
  onNavigate: (destination: string) => void;
  onSend: (receiveUpdates: boolean) => void;
};

export function ConfirmOrder({ orderId, onBack, onGoToMenu, onNavigate, onSend }: ConfirmOrderProps) {
  const { items, itemCount, serviceFee, total } = useCart();
  const { receiveUpdates, setReceiveUpdates, handleSendOrder, submittedId } = useConfirmOrder(orderId, items.length > 0, onSend);
  const table = new URLSearchParams(window.location.search).get("mesa")?.trim() || "12";
  const tableLabel = /^mesa\s/i.test(table) ? table : `Mesa ${table}`;

  return <div className="confirm-order-page">
    <ClientHeader title="MesaFlow" subtitle={tableLabel}
      backAction={<button type="button" className="confirm-order-back" aria-label="Voltar ao carrinho" onClick={onBack}><ChevronLeft aria-hidden="true" /></button>}
      cartAction={<button type="button" className="confirm-order-cart" aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} onClick={onBack}>
        <ShoppingCart aria-hidden="true" /><span aria-hidden="true">{itemCount}</span>
      </button>} />
    <main className="confirm-order-content">
      {submittedId !== null ? <section className="confirm-order-feedback" role="status">
        <Check aria-hidden="true" /><h1>Pedido #{submittedId} registrado.</h1><p>Confirmação demonstrativa. Nenhum pedido foi enviado à cozinha.</p>
        <Button onClick={() => onNavigate("status")}>Ver status do pedido</Button><Button variant="secondary" onClick={onGoToMenu}>Voltar ao cardápio</Button>
      </section> : items.length ? <>
        <p className="confirm-order-kicker">Revisão</p><h1>Confirme antes de enviar.</h1>
        <OrderReviewCard orderId={orderId} items={items} serviceFee={serviceFee} total={total} />
        <Switch className="confirm-order-updates" label="Receber atualizações nesta tela" checked={receiveUpdates} onChange={(event) => setReceiveUpdates(event.target.checked)} />
        <div className="confirm-order-actions"><Button onClick={handleSendOrder}>Enviar pedido</Button><Button variant="secondary" onClick={onBack}>Editar carrinho</Button></div>
        <p className="confirm-order-demo">Demonstração: a confirmação será feita apenas neste dispositivo, sem envio à cozinha.</p>
      </> : <section className="confirm-order-feedback"><h1>Seu carrinho está vazio.</h1><p>Adicione um item ao pedido para revisar.</p><Button onClick={onGoToMenu}>Explorar cardápio</Button></section>}
    </main>
    <ClientTabBar activeId="order" onMenu={onGoToMenu} onOrder={onBack} onNavigate={onNavigate} />
  </div>;
}
