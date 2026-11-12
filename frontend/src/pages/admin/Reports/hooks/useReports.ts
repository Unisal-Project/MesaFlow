import { useEffect, useState } from "react";
import { fetchSalesReport, type SalesReport } from "@/services/orders.service";
import { dateDaysAgo, formatCurrency } from "../../Order/utils/order.utils";
import { hasLowSales } from "../utils/report.utils";
import type { ReportPeriod } from "../types/report.types";

const methodLabels = {
  PIX: "Pix",
  CASH: "Dinheiro",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  UNKNOWN: "Não informado",
} as const;

/** Variação percentual com uma casa; null quando não há base de comparação. */
export const percentChange = (current: number, base: number) =>
  base > 0 ? Math.round(((current - base) / base) * 1000) / 10 : null;

/** Forma mais usada e sua fatia do total pago (pagamentos incluem a taxa). */
export function topMethodLabel(methods: Map<string, number>) {
  const topMethod = [...methods].sort((a, b) => b[1] - a[1])[0];
  if (!topMethod) return "—";
  const paidTotal = [...methods].reduce((total, [, value]) => total + value, 0);
  const label = methodLabels[topMethod[0] as keyof typeof methodLabels] ?? topMethod[0];
  return `${label} (${Math.round((topMethod[1] / Math.max(paidTotal, 0.01)) * 100)}%)`;
}

export function useReports() {
  const [period, setPeriodValue] = useState<ReportPeriod>("7days");
  const [startDate, setStartDateValue] = useState(() => dateDaysAgo(6));
  const [endDate, setEndDateValue] = useState(() => dateDaysAgo(0));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const setPeriod = (value: ReportPeriod) => { setPeriodValue(value); setSelectedDate(null); };
  const setStartDate = (value: string) => { setStartDateValue(value); setSelectedDate(null); };
  const setEndDate = (value: string) => { setEndDateValue(value); setSelectedDate(null); };
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const today = dateDaysAgo(0);
  const start = period === "custom" ? startDate : dateDaysAgo(period === "today" ? 0 : period === "30days" ? 29 : 6);
  const end = period === "custom" ? endDate : today;
  const rangeError = !start || !end ? "Informe as duas datas para visualizar o relatório." : start > end ? "A data inicial deve ser anterior ou igual à final." : end > today ? "Selecione um período até hoje." : "";

  useEffect(() => {
    if (rangeError) return;
    let cancelled = false;
    setLoadError("");
    // A resposta de um período antigo não pode sobrescrever a do atual.
    fetchSalesReport(start, end)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Não foi possível carregar o relatório.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [start, end, rangeError]);

  const error = rangeError || loadError;
  // Enquanto o período novo carrega, não mostra os números do anterior.
  const current = report && report.start === start && report.end === end ? report : null;
  const days = error || !current ? [] : current.days;

  const sum = (key: "revenue" | "orders" | "tables" | "serviceFee" | "cancellations", list = days) =>
    list.reduce((total, day) => total + day[key], 0);
  const periodRevenue = sum("revenue");
  const periodOrders = sum("orders");
  const periodTables = sum("tables");
  const periodTicket = periodOrders ? periodRevenue / periodOrders : 0;
  const periodDailyAverage = days.length ? periodRevenue / days.length : 0;

  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const scope = selectedDay ? [selectedDay] : days;
  const revenue = sum("revenue", scope);
  const orders = sum("orders", scope);
  const tables = sum("tables", scope);
  const averageTicket = orders ? revenue / orders : 0;

  // Período: compara com o anterior de mesmo tamanho. Dia: com a média do período.
  const previous = current?.previous;
  const changes = selectedDay
    ? [
        percentChange(revenue, periodDailyAverage),
        percentChange(orders, days.length ? periodOrders / days.length : 0),
        percentChange(averageTicket, periodTicket),
      ]
    : [
        percentChange(revenue, previous?.revenue ?? 0),
        percentChange(orders, previous?.orders ?? 0),
        percentChange(averageTicket, previous?.orders ? previous.revenue / previous.orders : 0),
      ];
  const scenario = selectedDay
    ? hasLowSales(selectedDay.revenue, periodDailyAverage) ? "negative" : "positive"
    : (changes[0] ?? 0) < 0 ? "negative" : "positive";

  const ranking = new Map<string, number>();
  const methods = new Map<string, number>();
  for (const day of scope) {
    day.products.forEach((product) => ranking.set(product.name, (ranking.get(product.name) ?? 0) + product.quantity));
    Object.entries(day.payments).forEach(([method, value]) => methods.set(method, (methods.get(method) ?? 0) + (value ?? 0)));
  }
  const products = [...ranking].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);
  const summary = {
    serviceFee: sum("serviceFee", scope),
    cancellations: sum("cancellations", scope),
    topMethod: topMethodLabel(methods),
    activeCategories: current?.activeCategories ?? 0,
  };

  const selectDay = (date: string) => setSelectedDate((value) => value === date ? null : date);
  const clearSelectedDay = () => setSelectedDate(null);
  const filteredProducts = products.filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const chartDays = days.map((day) => ({ ...day, label: new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", days.length <= 7 ? { weekday: "short" } : { day: "2-digit", month: "2-digit" }).replace(".", "") }));
  const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  const periodLabel = !rangeError ? `${formatDate(start)} a ${formatDate(end)}` : "Período inválido";
  const hasSales = periodRevenue > 0 || periodOrders > 0;

  const exportCsv = () => {
    if (!days.length || error) return;
    const decimal = (value: number) => value.toFixed(2).replace(".", ",");
    const periodChanges = [
      percentChange(periodRevenue, previous?.revenue ?? 0),
      percentChange(periodOrders, previous?.orders ?? 0),
      percentChange(periodTicket, previous?.orders ? previous.revenue / previous.orders : 0),
    ];
    const rows: (string | number)[][] = [
      ["Relatório MesaFlow"],
      ["Período", start, end],
      ["Data", "Faturamento (R$)", "Pedidos concluídos", "Ticket médio (R$)", "Mesas atendidas", "Taxa de serviço (R$)", "Cancelamentos"],
      ...days.map((day) => [day.date, decimal(day.revenue), day.orders, decimal(day.orders ? day.revenue / day.orders : 0), day.tables, decimal(day.serviceFee), day.cancellations]),
      ["Total", decimal(periodRevenue), periodOrders, decimal(periodTicket), periodTables, decimal(sum("serviceFee")), sum("cancellations")],
      [], ["Indicador", "Variação vs. período anterior (%)"],
      ...["Faturamento", "Pedidos concluídos", "Ticket médio"].map((label, index) => [label, periodChanges[index] === null ? "—" : String(periodChanges[index]).replace(".", ",")]),
      [], ["Produto", "Quantidade"],
      ...[...days.reduce((map, day) => { day.products.forEach((p) => map.set(p.name, (map.get(p.name) ?? 0) + p.quantity)); return map; }, new Map<string, number>())]
        .sort((a, b) => b[1] - a[1]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mesaflow-relatorios-${start}-${end}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return { selectedDay, selectDay, clearSelectedDay, formatDate, period, setPeriod, scenario, startDate, setStartDate, endDate, setEndDate, search, setSearch,
    today, error, loading: loading || (!error && !current), days, hasSales, revenue, orders, tables, averageTicket, changes, summary, chartDays, products: filteredProducts, periodLabel, exportCsv, formatCurrency };
}
