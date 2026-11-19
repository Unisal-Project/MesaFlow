import { useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import {
  fetchPaymentConfirmation,
  readPaymentSession,
  storePaymentSession,
  type PaymentConfirmationStatus,
} from "@/services/payment-confirmation.service";

export function usePaymentConfirmation(tableToken: string) {
  const [session, setSession] = useState(() => readPaymentSession(tableToken));
  const [snapshot, setSnapshot] = useState<{
    session: string;
    value: PaymentConfirmationStatus;
  } | null>(null);
  const status = snapshot?.session === session ? snapshot.value : null;

  function registerPaymentSession(value: string) {
    if (value) {
      storePaymentSession(tableToken, value);
      setSession(value);
    }
  }

  useEffect(() => {
    if (!session) return;
    const lifecycle = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;

    async function refresh() {
      if (lifecycle.signal.aborted || inFlight) return;
      clearTimeout(timer);
      inFlight = true;
      let keepPolling = true;
      try {
        const signal = AbortSignal.any([lifecycle.signal, AbortSignal.timeout(10_000)]);
        const value = await fetchPaymentConfirmation(session, signal);
        if (lifecycle.signal.aborted) return;
        setSnapshot({ session, value });
        if (value.status === "unavailable") {
          keepPolling = false;
          storePaymentSession(tableToken, "");
          setSession("");
        }
      } catch (error) {
        if (!lifecycle.signal.aborted && error instanceof ApiError && error.status === 403) {
          keepPolling = false;
          storePaymentSession(tableToken, "");
          setSession("");
        }
      } finally {
        inFlight = false;
        if (keepPolling && !lifecycle.signal.aborted) timer = setTimeout(refresh, 3000);
      }
    }

    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      lifecycle.abort();
      clearTimeout(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [session, tableToken]);

  return { hasSession: Boolean(session), status, registerPaymentSession };
}
