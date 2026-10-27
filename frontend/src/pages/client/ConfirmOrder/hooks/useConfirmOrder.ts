import { useRef, useState } from "react";

export function useConfirmOrder(orderId: number, canSend: boolean, onSend: () => void) {
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const sent = useRef(false);

  function handleSendOrder() {
    if (sent.current || !canSend) return;
    sent.current = true;
    setSubmittedId(orderId);
    onSend();
  }

  return { handleSendOrder, submittedId };
}
