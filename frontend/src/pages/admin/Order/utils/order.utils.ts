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
      `${order.id} ${order.table}`
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

  const todayTime = Date.parse(`${todayDate}T00:00:00Z`);

  const maximumAge =
    period === "today" ? 0 : period === "7days" ? 6 : 29;

  return orders.filter((order) => {
    const orderTime = Date.parse(
      `${order.date}T00:00:00Z`
    );

    const ageInDays =
      (todayTime - orderTime) / 86_400_000;

    return ageInDays >= 0 && ageInDays <= maximumAge;
  });
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
