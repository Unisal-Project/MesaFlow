import { useState } from "react";

import { useCart } from "@/contexts/useCart";

import {
  createOrder,
  CURRENT_ATTENDANCE_ID,
} from "@/services/orders.service";

export function useCartOrder(allowOrdering: boolean) {
  const {
    items,
    itemCount,
    subtotal,
    total,
    removeItem,
    updateQuantity,
    updateNotes,
    splitLine,
    clearCart,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  async function handleConfirm() {
    if (!allowOrdering) {
      setError(
        "Pedidos pelo QR Code ainda não estão disponíveis. Solicite ao atendente.",
      );
      return;
    }

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

  return {
    items,
    itemCount,
    subtotal,
    total,
    removeItem,
    updateQuantity,
    updateNotes,
    splitLine,
    isSubmitting,
    error,
    orderPlaced,
    handleConfirm,
  };
}