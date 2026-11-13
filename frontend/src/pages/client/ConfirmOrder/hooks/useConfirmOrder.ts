import { useRef, useState } from "react";

import { useCart } from "@/contexts/useCart";
import { createQrOrder } from "@/services/orders.service";

export function useConfirmOrder(
  tableToken: string,
  customerName: string,
) {
  const { items, clearCart } = useCart();

  const submitting = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOrder() {
    if (submitting.current || items.length === 0 || orderId) {
      return;
    }

    if (!tableToken) {
      setError("Não foi possível identificar a mesa pelo QR Code.");
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createQrOrder(tableToken, {
        customerName: customerName.trim() || "Cliente",
        items: items.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          notes: line.notes?.trim() || undefined,
        })),
      });

      setOrderId(response.order.id);
      clearCart();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar o pedido. Tente novamente.",
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    handleSendOrder,
    isSubmitting,
    orderId,
    error,
  };
}
