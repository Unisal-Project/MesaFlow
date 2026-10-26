import { useState } from "react";

import {
  chartPeriods,
  chartSalesHistory,
  salesHistory,
} from "../mocks/dashboard.mock";

import {
  currency,
  dateDaysAgo,
} from "../utils/dashboard.utils";

import type { DashboardPeriod } from "../types/dashboard.types";

export function useDashboard() {
  // Período do gráfico
  const [chartPeriod, setChartPeriod] = useState(7);

  // Período dos indicadores
  const [period, setPeriod] = useState<DashboardPeriod>("today");

  // Data específica selecionada
  const [specificDate, setSpecificDate] = useState(() => dateDaysAgo(0));

  // Dados do gráfico
  const salesDays = chartSalesHistory
    .slice(-chartPeriod)
    .map((value, index) => {
      const date = new Date();

      date.setDate(date.getDate() - (chartPeriod - 1 - index));

      return {
        value,
        label: date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
      };
    });

  // Filtro de vendas
  const today = dateDaysAgo(0);

  const startDate = dateDaysAgo(
    period === "7days" ? 6 : period === "30days" ? 29 : 0,
  );

  const selectedSales = salesHistory.filter(({ date }) => {
    if (period === "all") return true;

    if (period === "specific") return date === specificDate;

    return date >= startDate && date <= today;
  });

  // Cálculo das vendas
  const totalSales = selectedSales.reduce(
    (total, day) => total + day.sales,
    0,
  );

  const totalOrders = selectedSales.reduce(
    (total, day) => total + day.orders,
    0,
  );

  // Cálculo do ticket médio
  const averageTicket = totalOrders
    ? selectedSales.reduce(
        (total, day) => total + day.ticket * day.orders,
        0,
      ) / totalOrders
    : 0;

  const periodDetail = selectedSales.length
    ? "No período selecionado"
    : "Sem vendas no período";

  // Indicadores do Dashboard
  const indicators = [
    {
      label: period === "today" ? "Vendas hoje" : "Vendas no período",

      value: totalSales.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }),

      detail: period === "today" ? "+12% vs. ontem" : periodDetail,
    },
    {
      label: "Pedidos ativos",
      value: "3",
      detail: "3 em preparo agora",
    },
    {
      label: "Mesas ocupadas",
      value: "14/20",
      detail: "70% do salão agora",
    },
    {
      label: "Ticket médio",
      value: currency(averageTicket),
      detail: period === "today" ? "+4% na semana" : periodDetail,
    },
  ];

  return {
    // Filtros
    period,
    setPeriod,
    specificDate,
    setSpecificDate,
    today,

    // Gráfico
    chartPeriod,
    setChartPeriod,
    chartPeriods,
    salesDays,

    // Indicadores
    indicators,
  };
}