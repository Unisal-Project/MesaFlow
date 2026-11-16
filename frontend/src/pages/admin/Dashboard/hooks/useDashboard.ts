import { useMemo } from "react";

import type { Order } from "../../Order/types/order.types";
import type { RestaurantTable } from "../../Table/types/table.types";

import { currency, dateDaysAgo } from "../utils/dashboard.utils";

/**
 * Faturamento de um dia: soma dos pagamentos das contas fechadas nele
 * (regra 21: pagamentos PAID são a base financeira). Os pagamentos de uma
 * conta vêm só no primeiro pedido dela, então não há contagem dupla.
 */
export function salesOn(orders: Order[], day: string) {
  let total = 0;
  let accounts = 0;
  for (const order of orders) {
    const payment = order.payment;
    if (payment?.closedOn !== day || payment.entries.length === 0) continue;
    total += payment.entries.reduce((sum, entry) => sum + entry.amount, 0);
    accounts += 1;
  }
  return { total, accounts };
}

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? "Sem vendas ontem" : "Primeiras vendas desde ontem";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? "+" : ""}${change}% vs. ontem`;
};

export function useDashboard(orders: Order[] = [], tables: RestaurantTable[] = []) {
  const today = dateDaysAgo(0);

  const indicators = useMemo(() => {
    const todaySales = salesOn(orders, today);
    const yesterdaySales = salesOn(orders, dateDaysAgo(1));
    const openOrders = orders.filter((order) => order.status === "open");
    const activeTables = tables.filter((table) => table.active);
    const occupied = activeTables.filter((table) => table.status !== "available");
    const occupancy = activeTables.length
      ? Math.round((occupied.length / activeTables.length) * 100)
      : 0;
    const ticket = todaySales.accounts ? todaySales.total / todaySales.accounts : 0;

    return [
      {
        label: "Vendas hoje",
        value: currency(todaySales.total),
        detail: percentChange(todaySales.total, yesterdaySales.total),
      },
      {
        label: "Pedidos ativos",
        value: String(openOrders.length),
        detail: "Em contas ainda abertas",
      },
      {
        label: "Mesas ocupadas",
        value: `${occupied.length}/${activeTables.length}`,
        detail: `${occupancy}% do salão agora`,
      },
      {
        label: "Ticket médio",
        value: currency(ticket),
        detail: `${todaySales.accounts} ${todaySales.accounts === 1 ? "conta fechada" : "contas fechadas"} hoje`,
      },
    ];
  }, [orders, tables, today]);

  // Os mais recentes primeiro: é o que a equipe precisa acompanhar agora.
  const queue = useMemo(
    () =>
      orders
        .filter((order) => order.status === "open")
        .sort((a, b) => b.id - a.id)
        .slice(0, 4),
    [orders],
  );

  return { today, indicators, queue };
}
