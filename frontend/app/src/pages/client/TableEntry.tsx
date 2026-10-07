import { useEffect, useState } from "react";
import { resolveTable, type TableIdentity } from "@/services/tables.service";
import { ClientFlow } from "./ClientFlow";

export function TableEntry() {
  const token = new URLSearchParams(window.location.search).get("mesa");
  const [table, setTable] = useState<TableIdentity | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    resolveTable(token).then((value) => {
      if (!cancelled) setTable(value);
    }).catch((reason: Error) => {
      if (!cancelled) setError(reason.message);
    });
    return () => { cancelled = true; };
  }, [token, attempt]);

  if (!token) return <main className="mf-screen"><p>Escaneie o QR Code da sua mesa para acessar o cardápio.</p></main>;
  if (error) return <main className="mf-screen"><h1>Não foi possível identificar a mesa</h1><p role="alert">{error}</p><button onClick={() => { setError(""); setTable(null); setAttempt((value) => value + 1); }}>Tentar novamente</button></main>;
  if (!table) return <main className="mf-screen" role="status">Identificando sua mesa…</main>;
  return <><div role="status" className="table-origin">Mesa {table.number}{table.name ? ` — ${table.name}` : ""}</div><ClientFlow allowOrdering={false} /></>;
}
