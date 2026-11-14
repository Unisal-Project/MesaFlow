import { useEffect, useRef, useState } from "react";
import { callWaiter } from "@/services/waiter-calls.service";

export function useCallWaiter(token: string) {
  const [isCalling, setIsCalling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    setIsCalling(false);
    setSuccess(false);
    setError(null);
    return () => { generation.current++; };
  }, [token]);

  async function handleCall() {
    if (pending.current) return;
    pending.current = true;
    const attempt = generation.current;
    setIsCalling(true);
    setSuccess(false);
    setError(null);
    try {
      await callWaiter(token);
      if (attempt === generation.current) setSuccess(true);
    } catch (reason) {
      if (attempt === generation.current) setError(reason instanceof Error ? reason.message : "Não foi possível chamar o garçom.");
    } finally {
      if (attempt === generation.current) {
        pending.current = false;
        setIsCalling(false);
      }
    }
  }
  return { isCalling, success, error, handleCall };
}
