
import { useState } from "react";

import { useClientTable } from "@/contexts/ClientTableContext";
import { requestQrClosing } from "@/services/attendance.service";

export function useTableBill(
  tableToken: string,
  attendanceId: string | null,
  onSuccess: () => void,
) {
  const { registerPaymentSession } = useClientTable();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleRequestClose() {
    if (isSubmitting) return;

    if (!tableToken) {
      setRequestError("Mesa não identificada. Escaneie o QR Code novamente.");
      return;
    }

    if (!attendanceId) return;

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await requestQrClosing(tableToken, attendanceId);
      registerPaymentSession(response.paymentSession);
      onSuccess();
    } catch (reason) {
      setRequestError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível solicitar o fechamento da conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isSubmitting,
    requestError,
    handleRequestClose,
  };
}
