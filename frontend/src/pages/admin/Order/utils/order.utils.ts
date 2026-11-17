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

export const dateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateKey(date);
};

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

/**
 * Dia de operação atual (AAAA-MM-DD), com a regra do backend: fuso de São Paulo
 * e virada às 05:00 (padrão). O front não carrega a virada configurada, então
 * vale o dia mais recente entre este cálculo e os pedidos recebidos: se a
 * virada for antes das 05:00, o primeiro pedido do novo dia já corrige.
 */
export function currentBusinessDate(orders: NumberedOrder[] = [], now = new Date()) {
  const computed = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() - 5 * 3_600_000));
  return orders.reduce(
    (latest, order) => (order.businessDate && order.businessDate > latest ? order.businessDate : latest),
    computed,
  );
}

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
export function sortOrders<T extends DatedOrderSummary & { time: string }>(
  orders: T[],
  sort: OrderSort,
): T[] {
  const direction = sort === "newest" ? -1 : 1;
  return [...orders].sort((a, b) => {
    const dateComparison = a.date.localeCompare(b.date);
    const timeComparison = a.time.localeCompare(b.time);
    return direction * (dateComparison || timeComparison || a.id - b.id);
  });
}

// Só agrupa pedidos quando existe um atendimento identificado em comum.
export function getAccountOrders(orders: Order[], selected: Order): Order[] {
  return orders.filter((order) => order.status !== "closed" &&
    (selected.attendanceId ? order.attendanceId === selected.attendanceId : order.id === selected.id));
}
