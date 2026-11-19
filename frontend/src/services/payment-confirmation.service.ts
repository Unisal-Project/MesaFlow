import { apiRequest } from "@/api/client";

export type PaymentReceipt = {
  totalInCents: number;
  tableNumber: string;
  paidAt: string;
  restaurantName: string;
  timeZone: string;
};

export type PaymentConfirmationStatus =
  | { status: "pending" | "unavailable" }
  | { status: "confirmed"; event: { receipt: PaymentReceipt } };

export function fetchPaymentConfirmation(session: string, signal: AbortSignal) {
  return apiRequest<PaymentConfirmationStatus>("/client/payment-confirmation", {
    headers: { Authorization: `Bearer ${session}` },
    signal,
    cache: "no-store",
  });
}

const storageKey = (tableToken: string) => `mesaflow:payment-session:${tableToken}`;

export function readPaymentSession(tableToken: string) {
  try {
    return tableToken ? sessionStorage.getItem(storageKey(tableToken)) ?? "" : "";
  } catch {
    return "";
  }
}

export function storePaymentSession(tableToken: string, session: string) {
  if (!tableToken) return;
  try {
    if (session) sessionStorage.setItem(storageKey(tableToken), session);
    else sessionStorage.removeItem(storageKey(tableToken));
  } catch {
    // A credencial continua disponível em memória enquanto a página estiver aberta.
  }
}
