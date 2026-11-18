import { useMemo } from "react";

import type { Order } from "../../Order/types/order.types";
import type { RestaurantTable } from "../../Table/types/table.types";

import { currency } from "../utils/dashboard.utils";
import { businessDaysAgo } from "@/utils/businessDay";

/**
 * Vendas de um dia de operação: soma dos pagamentos das contas fechadas nele
 * (regra 21: pagamentos PAID são a base financeira) SEM a taxa de serviço, igual
 * a Relatórios; a taxa vem à parte em `serviceFee`. Os pagamentos e a taxa de uma
 * conta vêm só no primeiro pedido dela, então não há contagem dupla. `orders` é
 * o nº de pedidos concluídos (a base do ticket médio, como em Relatórios).
 */
export function salesOn(orders: Order[], day: string) {
  let totalCents = 0;
  let feeCents = 0;
  let accounts = 0;
  let count = 0;
  for (const order of orders) {
    const payment = order.payment;
    if (payment?.closedOn !== day) continue;
    count += 1;
    if (payment.entries.length === 0) continue;
    const paid = payment.entries.reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0);
    const fee = Math.round((payment.serviceFee ?? 0) * 100);
    totalCents += paid - fee;
    feeCents += fee;
    accounts += 1;
  }
  return { total: totalCents / 100, accounts, orders: count, serviceFee: feeCents / 100 };
}

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? "Sem vendas ontem" : "Primeiras vendas desde ontem";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? "+" : ""}${change}% vs. ontem`;
};

export function useDashboard(orders: Order[] = [], tables: RestaurantTable[] = []) {
  // Dia de operação (virada de Configurações), o mesmo de Pedidos e Relatórios.
  const today = businessDaysAgo(0);

  const indicators = useMemo(() => {
    const todaySales = salesOn(orders, today);
    const yesterdaySales = salesOn(orders, businessDaysAgo(1));
    const openOrders = orders.filter((order) => order.status === "open");
    const activeTables = tables.filter((table) => table.active);
    const occupied = activeTables.filter((table) => table.status !== "available");
    const occupancy = activeTables.length
      ? Math.round((occupied.length / activeTables.length) * 100)
      : 0;
    const ticket = todaySales.orders ? todaySales.total / todaySales.orders : 0;

    return [
      {
        label: "Vendas hoje",
        value: currency(todaySales.total),
        detail:
          (todaySales.total === 0 ? "Sem vendas ainda hoje" : percentChange(todaySales.total, yesterdaySales.total)) +
          // Venda é sem a taxa de serviço; ela aparece à parte (e não parece crescimento).
          (todaySales.serviceFee > 0 ? ` · taxa de serviço à parte: ${currency(todaySales.serviceFee)}` : ""),
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
        detail: `${todaySales.orders} ${todaySales.orders === 1 ? "pedido concluído" : "pedidos concluídos"} hoje`,
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
