import type { ReactNode } from "react";
import type { CartLine } from "@/contexts/CartContext";

export type CartPageProps = {
  onReview?: () => void;
  onNavigate?: (destination: string) => void;
  allowOrdering?: boolean;
  onBack: () => void;
  onGoToMenu: () => void;
  onOrderConfirmed: () => void;
};

export type CartItemProps = {
  line: CartLine;
  maxQuantity: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onSplitLine: (id: string) => void;
  onRemove: (id: string) => void;
};

export type CartSummaryProps = {
  children?: ReactNode;
  subtotal: number;
  serviceFee: number;
  total: number;
};