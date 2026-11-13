import { ClientTableProvider } from "@/contexts/ClientTableContext";
import { ClientFlow } from "./ClientFlow";

export function TableEntry() {
  const token = new URLSearchParams(window.location.search).get("mesa")?.trim();
  if (!token) return <main className="mf-screen"><p>Escaneie o QR Code da sua mesa para acessar o cardápio.</p></main>;
  return <ClientTableProvider key={token} token={token}><ClientFlow allowOrdering={false} /></ClientTableProvider>;
}
