import { useState } from "react";
import { ChevronLeft, ShoppingCart, Menu, Clock, ReceiptText  } from "lucide-react";
import "./styles.css";

// Estes dados virão do backend depois.
const order = {
  id: 1842,
  item: "Risoto de cogumelos",
  quantity: 1,
  price: "R$ 48,90",
};

export function ConfirmOrder() {
  const [receiveUpdates, setReceiveUpdates] = useState(true);

  function handleSendOrder() {
    // Aqui você fará o POST para o backend futuramente.
    console.log("Enviar pedido", order.id, { receiveUpdates });
  }

  return (
    <div className="confirm-order-page">
      <header className="confirm-order-header">
        <button type="button" className="icon-button" aria-label="Voltar">
          <ChevronLeft />
        </button>

        <div>
          <strong>MesaFlow</strong>
          <span>Revisão</span>
        </div>

        <button type="button" className="icon-button cart-button" aria-label="Carrinho">
          <ShoppingCart />
          <b>{order.quantity}</b>
        </button>
      </header>

      <main className="confirm-order-content">
        <span className="kicker">REVISÃO</span>
        <h1>Confirme antes de enviar.</h1>

        <section className="order-card">
          <h2>Pedido #{order.id}</h2>
          <p>O pedido será enviado diretamente para a cozinha e poderá ser acompanhado por este ID.</p>

          <div className="order-item">
            <strong>{order.quantity}x {order.item}</strong>
            <strong>{order.price}</strong>
          </div>
        </section>

        <label className="updates-toggle">
          <input
            type="checkbox"
            checked={receiveUpdates}
            onChange={(event) => setReceiveUpdates(event.target.checked)}
          />
          <span className="switch" />
          Receber atualizações nesta tela
        </label>

        <div className="actions">
          <button type="button" className="primary-button" onClick={handleSendOrder}>Enviar pedido</button>
          <button type="button" className="secondary-button">Editar carrinho</button>
        </div>
      </main>

      <nav className="bottom-navigation" aria-label="Navegação principal">
        <button type="button"><Menu /><span>Cardápio</span></button>
        <button type="button" className="active"><ShoppingCart /><span>Pedido</span></button>
        <button type="button"><Clock /><span>Status</span></button>
        <button type="button"><ReceiptText /><span>Conta</span></button>
      </nav>
    </div>
  );
}
