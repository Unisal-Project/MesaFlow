import type { OrderTrackingStatus } from "../types/orderTracking.types";

import type { OrderStep } from "@/components";

import {
    Clock,
    Menu,
    ReceiptText,
    ShoppingCart
} from "lucide-react"

export const orderSteps: (OrderStep & { id: OrderTrackingStatus })[] = [
  { id: "waiting", label: "Aguardando", description: "Pedido recebido pela cozinha." },
  { id: "preparing", label: "Em preparo", description: "Os itens estão sendo preparados." },
  { id: "ready", label: "Pronto", description: "A equipe avisará quando sair." },
  { id: "delivered", label: "Entregue", description: "Bom apetite." },
];

export const statusMessages: Record<OrderTrackingStatus, string> = {
  waiting: "Seu pedido foi recebido pela cozinha.",
  preparing: "Seu pedido está em preparo.",
  ready: "Seu pedido está pronto.",
  delivered: "Seu pedido foi entregue. Bom apetite!",
};

export const navigationItems = [
  { id: "menu", label: "Cardápio", icon: <Menu aria-hidden="true" /> },
  { id: "order", label: "Pedido", icon: <ShoppingCart aria-hidden="true" /> },
  { id: "status", label: "Status", icon: <Clock aria-hidden="true" /> },
  { id: "bill", label: "Conta", icon: <ReceiptText aria-hidden="true" /> },
];