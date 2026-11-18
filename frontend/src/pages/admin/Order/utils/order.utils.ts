import { businessDaysAgo, businessToday } from "@/utils/businessDay";
import type {
  Order,
  OrderSummary,
  OrderFilter,
  OrderPeriod,
  OrderSort,
  DatedOrderSummary,
} from "../types/order.types";


export const toDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

/** Data (AAAA-MM-DD) do dia de operação de `days` dias atrás; 0 = hoje. */
export const dateDaysAgo = (days: number) => businessDaysAgo(days);

export const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const getItemCount = (order: Order) =>
  order.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

export const getOrderTotal = (order: Order) =>
  order.items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0
  );

export const getCurrentTime = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

type NumberedOrder = { id: number; dailyNumber?: number; businessDate?: string; date?: string };

/** Dia de operação atual (AAAA-MM-DD), com a virada configurada em Configurações. */
export const currentBusinessDate = (now = new Date()) => businessToday(now);

/**
 * Número exibido do pedido: `#27` (número do dia; cai para o id). Se o pedido
 * não é do dia de operação `today`, vem com a data: `#27 · 17/11`.
 */
export function orderNumber(order: NumberedOrder, today?: string) {
  const label = `#${order.dailyNumber ?? order.id}`;
  const day = order.businessDate ?? order.date;
  if (!today || !day || day === today) return label;
  const [, month, date] = day.split("-");
  return `${label} · ${date}/${month}`;
}

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export function filterOrders<T extends OrderSummary>(
  orders: T[],
  status: OrderFilter,
  searchQuery: string,
): T[] {
  const normalizedSearch = normalizeSearchText(searchQuery.trim());

  return orders.filter((order) => {
    const matchesStatus =
      status === "all" || order.status === status;

    const searchableContent = normalizeSearchText(
      // Busca pelo número do dia (#27) e pelo id interno.
      `${order.id} #${order.dailyNumber ?? order.id} ${order.table}`
    );

    return matchesStatus &&
      searchableContent.includes(normalizedSearch);
  });
}

export function filterOrdersByDate<T extends DatedOrderSummary>(
  orders: T[],
  period: OrderPeriod,
  specificDate: string,
  todayDate: string,
): T[] {
  if (period === "all") return orders;

  if (period === "specific") {
    return orders.filter(
      (order) => order.date === specificDate
    );
  }

  if (period === "today") {
    // Dia de trabalho: pedidos antigos continuam enquanto a conta está aberta.
    return orders.filter((order) => order.date === todayDate ||
      (order.date < todayDate && order.status === "open"));
  }

  // Calendário local, sem dividir milissegundos (dias de horário de verão variam).
  const start = new Date(`${todayDate}T12:00:00`);
  start.setDate(start.getDate() - (period === "yesterday" ? 1 : period === "7days" ? 6 : 29));
  const firstDate = toDateKey(start);
  return orders.filter((order) => period === "yesterday"
    ? order.date === firstDate
    : order.date >= firstDate && order.date <= todayDate);

}
/**
 * Ordena pelo instante de criação (createdAt) e desempata por id. Dia + "HH:MM"
 * como texto erra num turno que passa da meia-noite: no mesmo dia de operação,
 * "23:59" > "00:47". Sem createdAt (dados antigos) cai no dia + hora.
 */
export function sortOrders<T extends DatedOrderSummary & { time: string; createdAt?: string }>(
  orders: T[],
  sort: OrderSort,
): T[] {
  const direction = sort === "newest" ? -1 : 1;
  return [...orders].sort((a, b) => {
    const instant = a.createdAt && b.createdAt ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : 0;
    const fallback = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    return direction * (instant || fallback || a.id - b.id);
  });
}

// Só agrupa pedidos quando existe um atendimento identificado em comum.
export function getAccountOrders(orders: Order[], selected: Order): Order[] {
  return orders.filter((order) => order.status !== "closed" &&
    (selected.attendanceId ? order.attendanceId === selected.attendanceId : order.id === selected.id));
}

/** Aceita "12,5", "1.234,50" e "1.000" (ponto de milhar); "12.5" segue decimal. */
export const parseAmount = (value: string) => {
  const text = value.trim();
  const thousands = text.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(text);
  const amount = Number(thousands ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};
