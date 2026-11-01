import { useRef, useState } from "react";

import { useCart } from "@/contexts/useCart";

import {
  createOrder,
} from "@/services/orders.service";

export function useCartOrder(allowOrdering: boolean, attendanceId?: string) {
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

  const submitting = useRef(false);
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

    if (submitting.current || items.length === 0) return;
    if (!attendanceId) {
      setError("Não foi possível identificar o atendimento. Solicite ao atendente.");
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      await createOrder({
        attendanceId,
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
      submitting.current = false;
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