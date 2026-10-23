import { useRef, useState } from "react";

export function useConfirmOrder(orderId: number, canSend: boolean, onSend: (receiveUpdates: boolean) => void) {
  const [receiveUpdates, setReceiveUpdates] = useState(true);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const sent = useRef(false);

  function handleSendOrder() {
    if (sent.current || !canSend) return;
    sent.current = true;
    setSubmittedId(orderId);
    onSend(receiveUpdates);
  }

  return { receiveUpdates, setReceiveUpdates, handleSendOrder, submittedId };
}
