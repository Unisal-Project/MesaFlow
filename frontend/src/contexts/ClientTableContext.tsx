import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveTable, type TableIdentity } from "@/services/tables.service";

export const customerStorageKey = (token: string) => `mesaflow:customer:${token}`;
export const tableLabel = (table: TableIdentity) => `Mesa ${String(table.number).padStart(2, "0")}`;

export function readCustomerName(token: string) {
  try { return token ? sessionStorage.getItem(customerStorageKey(token)) ?? "" : ""; }
  catch { return ""; }
}

export function storeCustomerName(token: string, name: string) {
  try { if (token) sessionStorage.setItem(customerStorageKey(token), name); }
  catch { /* A navegação continua quando o armazenamento está indisponível. */ }
}

const ClientTableContext = createContext({ tableLabel: "MesaFlow", guestName: "", setGuestName: (_name: string) => {} });
export const useClientTable = () => useContext(ClientTableContext);

export function ClientTableProvider({ token, children }: { token: string; children: ReactNode }) {
  const [guestName, updateGuestName] = useState(() => readCustomerName(token));
  const [table, setTable] = useState<TableIdentity | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    resolveTable(token).then((value) => {
      if (!cancelled) setTable(value);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Não foi possível consultar a mesa.");
    });
    return () => { cancelled = true; };
  }, [token, attempt]);

  function setGuestName(name: string) {
    updateGuestName(name);
    storeCustomerName(token, name);
  }

  if (token && error) return <main className="mf-screen"><h1>Não foi possível identificar a mesa</h1><p role="alert">{error}</p><button type="button" onClick={() => { setError(""); setTable(null); setAttempt(value => value + 1); }}>Tentar novamente</button></main>;
  if (token && !table) return <main className="mf-screen" role="status">Identificando sua mesa…</main>;

  return <ClientTableContext.Provider value={{ tableLabel: table ? tableLabel(table) : "MesaFlow", guestName, setGuestName }}>{children}</ClientTableContext.Provider>;
}
