export type OrderStatus = "waiting" | "preparing" | "ready" | "delivered";
export type OrderFilter = "all" | OrderStatus;
export type OrderPeriod = "today" | "7days" | "30days" | "all" | "specific";

export type OrderSummary = {
  id: number;
  table: string;
  status: OrderStatus;
};

type DatedOrderSummary = OrderSummary & { date: string };

export const orderStatuses: OrderStatus[] = [
  "waiting",
  "preparing",
  "ready",
  "delivered",
];

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export function getNextStatus(status: OrderStatus): OrderStatus {
  const currentIndex = orderStatuses.indexOf(status);
  return orderStatuses[Math.min(currentIndex + 1, orderStatuses.length - 1)];
}

export function getPreviousStatus(status: OrderStatus): OrderStatus {
  const currentIndex = orderStatuses.indexOf(status);
  return orderStatuses[Math.max(currentIndex - 1, 0)];
}

export function filterOrders<T extends OrderSummary>(
  orders: T[],
  status: OrderFilter,
  searchQuery: string,
): T[] {
  const normalizedSearch = normalizeSearchText(searchQuery.trim());

  return orders.filter((order) => {
    const matchesStatus = status === "all" || order.status === status;
    const searchableContent = normalizeSearchText(`${order.id} ${order.table}`);

    return matchesStatus && searchableContent.includes(normalizedSearch);
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
    return orders.filter((order) => order.date === specificDate);
  }
  const todayTime = Date.parse(`${todayDate}T00:00:00Z`);
  const maximumAge = period === "today" ? 0 : period === "7days" ? 6 : 29;

  return orders.filter((order) => {
    const orderTime = Date.parse(`${order.date}T00:00:00Z`);
    const ageInDays = (todayTime - orderTime) / 86_400_000;
    return ageInDays >= 0 && ageInDays <= maximumAge;
  });
}
