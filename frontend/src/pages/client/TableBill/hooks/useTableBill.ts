
import { useState } from "react";

import { requestQrClosing } from "@/services/attendance.service";

export function useTableBill(
  tableToken: string,
  onSuccess: () => void,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleRequestClose() {
    if (isSubmitting) return;

    if (!tableToken) {
      setRequestError("Mesa não identificada. Escaneie o QR Code novamente.");
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    try {
      await requestQrClosing(tableToken);
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
