import { Check, ChevronLeft, Clock, Menu, ReceiptText, ShoppingCart } from "lucide-react";
import { Badge, BottomNavigation, Button, ClientHeader, IconButton } from "@/components";
import "./styles.css";

type OrderSuccessProps = {
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
};

const navigationItems = [
  { id: "menu", label: "Cardápio", icon: <Menu aria-hidden="true" /> },
  { id: "order", label: "Pedido", icon: <ShoppingCart aria-hidden="true" /> },
  { id: "status", label: "Status", icon: <Clock aria-hidden="true" /> },
  { id: "bill", label: "Conta", icon: <ReceiptText aria-hidden="true" /> },
];

export function OrderSuccess({ onBack, onNavigate }: OrderSuccessProps) {
  function handleNavigate(destination: string) {
    onNavigate?.(destination);
  }

  return (
    <div className="order-success-page">
      <ClientHeader
        title="MesaFlow"
        subtitle="Pedido enviado"
        backAction={
          <IconButton type="button" label="Voltar" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </IconButton>
        }
        cartAction={
          <IconButton
            type="button"
            label="Carrinho, 0 itens"
            onClick={() => handleNavigate("order")}
          >
            <ShoppingCart aria-hidden="true" />
            <Badge variant="warning" className="order-success-cart-count" aria-hidden="true">
              0
            </Badge>
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
            A cozinha já foi notificada. Você pode acompanhar o preparo em tempo real.
          </p>
          <div className="order-success-actions">
            <Button type="button" variant="primary" onClick={() => handleNavigate("status")}>
              Acompanhar preparo
            </Button>
            <Button type="button" variant="ghost" onClick={() => handleNavigate("menu")}>
              Pedir mais itens
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation items={navigationItems} activeId="" onChange={handleNavigate} />
    </div>
  );
}
