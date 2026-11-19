import { useRef, useState } from "react";

import { ApiError } from "@/api/client";
import { useClientTable } from "@/contexts/ClientTableContext";
import { useCart } from "@/contexts/useCart";
import { createQrOrder } from "@/services/orders.service";

export function useConfirmOrder(
  tableToken: string,
  customerName: string,
) {
  const { items, clearCart } = useCart();
  const { registerPaymentSession } = useClientTable();

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

      registerPaymentSession(response.paymentSession);
      setOrderId(response.order.id);
      clearCart();
    } catch (reason) {
      // 400 de validação traz o motivo em issues (ex.: limite de itens).
      const issue =
        reason instanceof ApiError
          ? (reason.data as { issues?: { message: string }[] })?.issues?.[0]
          : undefined;
      setError(
        issue?.message ??
          (reason instanceof Error
            ? reason.message
            : "Não foi possível enviar o pedido. Tente novamente."),
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
