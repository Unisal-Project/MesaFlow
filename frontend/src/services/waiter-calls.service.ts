import { apiRequest } from "@/api/client";
import { authHeaders } from "./auth.service";

export type WaiterCall = {
  id: string;
  tableId: string;
  table: { number: number };
  status: "PENDING" | "ATTENDED";
  createdAt: string;
  attendedAt: string | null;
};

export function callWaiter(token: string) {
  if (!token.trim()) return Promise.reject(new Error("Mesa não identificada. Escaneie o QR Code novamente."));
  return apiRequest<WaiterCall>(`/tables/by-token/${encodeURIComponent(token)}/call-waiter`, { method: "POST" });
}
export const fetchWaiterCalls = () => apiRequest<WaiterCall[]>("/waiter-calls", { headers: authHeaders() });
export const attendWaiterCall = (id: string) => apiRequest<WaiterCall>(`/waiter-calls/${encodeURIComponent(id)}/attend`, { method: "PATCH", headers: authHeaders() });
