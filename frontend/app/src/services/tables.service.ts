import { API_URL } from "./api";

export type TableIdentity = { id: string; number: number; name: string | null };
export type TableStatus = "available" | "occupied" | "closing_requested" | "awaiting_payment";
export type TableRecord = TableIdentity & {
  active: boolean;
  menuUrl: string;
  status: TableStatus;
  attendanceId: string | null;
};
export type TableInput = { number: number; name: string; active: boolean };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Não foi possível acessar as mesas");
  }
  return response.json();
}
export const fetchTables = () => request<TableRecord[]>("/tables");
export const changeTableStatus = (table: TableRecord, status: TableStatus) => request<TableRecord>(`/tables/${table.id}/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status, attendanceId: table.attendanceId }),
});
export const resolveTable = (token: string) => request<TableIdentity>(`/tables/by-token/${encodeURIComponent(token)}`);
export const tableQrUrl = (id: string) => `${API_URL}/tables/${id}/qrcode`;
export const saveTable = (data: TableInput, id?: string) => request<TableRecord>(id ? `/tables/${id}` : "/tables", {
  method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
});
export const removeTable = (id: string) => request(`/tables/${id}`, { method: "DELETE" });
export async function downloadTableQr(id: string) {
  const response = await fetch(tableQrUrl(id));
  if (!response.ok) throw new Error("Não foi possível baixar o QR Code");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `mesa-${id}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
