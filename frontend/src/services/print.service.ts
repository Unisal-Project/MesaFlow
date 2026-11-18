export type PrintItemInput = {
  name: string;
  quantity: number;
  notes?: string;
  
  category?: string;
};

export type PrintOrderInput = {
  orderId: string;
  orderLabel: string;
  tableLabel: string;
  items: PrintItemInput[];
  observation?: string;
  printedAt: string;
};


export function formatPrintTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function getDefaultPrintUrl(): string {
  if (typeof window === "undefined") return "http://localhost:9101";
  return `${window.location.protocol}//${window.location.hostname}:9101`;
}

export const PRINT_URL = (
  import.meta.env.VITE_PRINT_URL || getDefaultPrintUrl()
).replace(/\/+$/, "");

export async function printOrder(input: PrintOrderInput): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${PRINT_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar na impressora. Verifique se a ponte local está aberta.",
    );
  }
  if (!response.ok) {
    throw new Error(`Falha ao imprimir o pedido ${input.orderLabel}.`);
  }
}