import { ChevronLeft, Clock, Menu, ReceiptText, ShoppingCart } from "lucide-react";
import {
  Badge,
  BottomNavigation,
  Button,
  ClientHeader,
  IconButton,
  OrderProgress,
  type OrderStep,
} from "@/components";
import { mockOrderTracking, type OrderTrackingData, type OrderTrackingStatus } from "./data";
import "./styles.css";

type OrderTrackingProps = {
  order?: OrderTrackingData;
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
};

const orderSteps: (OrderStep & { id: OrderTrackingStatus })[] = [
  { id: "waiting", label: "Aguardando", description: "Pedido recebido pela cozinha." },
  { id: "preparing", label: "Em preparo", description: "Os itens estão sendo preparados." },
  { id: "ready", label: "Pronto", description: "A equipe avisará quando sair." },
  { id: "delivered", label: "Entregue", description: "Bom apetite." },
];

const statusMessages: Record<OrderTrackingStatus, string> = {
  waiting: "Seu pedido foi recebido pela cozinha.",
  preparing: "Seu pedido está em preparo.",
  ready: "Seu pedido está pronto.",
  delivered: "Seu pedido foi entregue. Bom apetite!",
};

const navigationItems = [
  { id: "menu", label: "Cardápio", icon: <Menu aria-hidden="true" /> },
  { id: "order", label: "Pedido", icon: <ShoppingCart aria-hidden="true" /> },
  { id: "status", label: "Status", icon: <Clock aria-hidden="true" /> },
  { id: "bill", label: "Conta", icon: <ReceiptText aria-hidden="true" /> },
];

export function OrderTracking({ order = mockOrderTracking, onBack, onNavigate }: OrderTrackingProps) {
  function handleNavigate(destination: string) {
    onNavigate?.(destination);
  }

  return (
    <div className="order-tracking-page">
      <ClientHeader
        title="MesaFlow"
        subtitle="Acompanhamento"
        backAction={
          <IconButton type="button" label="Voltar" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </IconButton>
        }
        cartAction={
          <IconButton
            type="button"
            label={`Carrinho, ${order.cartItemCount} ${order.cartItemCount === 1 ? "item" : "itens"}`}
            onClick={() => handleNavigate("order")}
          >
            <ShoppingCart aria-hidden="true" />
            <Badge variant="warning" className="order-tracking-cart-count" aria-hidden="true">
              {order.cartItemCount}
            </Badge>
          </IconButton>
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

      <BottomNavigation items={navigationItems} activeId="status" onChange={handleNavigate} />
    </div>
  );
}
