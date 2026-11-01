import { useState } from "react";
import { dateDaysAgo, formatCurrency } from "../../Order/utils/order.utils";
import { reportHistory, reportScenarios } from "../mocks/reports.mock";
import { hasLowSales } from "../utils/report.utils";
import type { ReportPeriod } from "../types/report.types";

export function useReports() {
  const [period, setPeriodValue] = useState<ReportPeriod>("7days");
  const [startDate, setStartDateValue] = useState(() => dateDaysAgo(6));
  const [endDate, setEndDateValue] = useState(() => dateDaysAgo(0));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const setPeriod = (value: ReportPeriod) => { setPeriodValue(value); setSelectedDate(null); };
  const setStartDate = (value: string) => { setStartDateValue(value); setSelectedDate(null); };
  const setEndDate = (value: string) => { setEndDateValue(value); setSelectedDate(null); };
  const [search, setSearch] = useState("");
  const today = dateDaysAgo(0);
  const start = period === "custom" ? startDate : dateDaysAgo(period === "today" ? 0 : period === "30days" ? 29 : 6);
  const end = period === "custom" ? endDate : today;
  const error = !start || !end ? "Informe as duas datas para visualizar o relatório." : start > end ? "A data inicial deve ser anterior ou igual à final." : end > today ? "Selecione um período até hoje." : "";
  const days = error ? [] : reportHistory.filter((day) => day.date >= start && day.date <= end);
  const periodRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const periodOrders = days.reduce((sum, day) => sum + day.orders, 0);
  const periodTables = days.reduce((sum, day) => sum + day.tables, 0);
  const periodAverageTicket = periodOrders ? periodRevenue / periodOrders : 0;
  const ranking = new Map<string, number>();
  days.forEach((day) => day.products.forEach((product) => ranking.set(product.name, (ranking.get(product.name) ?? 0) + product.quantity)));
  const periodProducts = [...ranking].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const revenue = selectedDay?.revenue ?? periodRevenue;
  const orders = selectedDay?.orders ?? periodOrders;
  const tables = selectedDay?.tables ?? periodTables;
  const averageTicket = orders ? revenue / orders : 0;
  const periodDailyAverage = days.length ? periodRevenue / days.length : 0;
  const historyDailyAverage = reportHistory.reduce((sum, day) => sum + day.revenue, 0) / reportHistory.length;
  const periodScenario = hasLowSales(periodDailyAverage, historyDailyAverage) ? "negative" : "positive";
  const scenario = selectedDay ? hasLowSales(selectedDay.revenue, periodDailyAverage) ? "negative" : "positive" : periodScenario;
  const products = selectedDay ? [...selectedDay.products].sort((a, b) => b.quantity - a.quantity) : periodProducts;
  const selectDay = (date: string) => setSelectedDate((current) => current === date ? null : date);
  const clearSelectedDay = () => setSelectedDate(null);
  const filteredProducts = products.filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const summary = reportScenarios[scenario];
  const cancellations = selectedDay ? Math.ceil(summary.cancellationsPerWeek / 7) : days.length ? Math.round(summary.cancellationsPerWeek * days.length / 7) : 0;
  const exportSummary = reportScenarios[periodScenario];
  const exportCancellations = days.length ? Math.round(exportSummary.cancellationsPerWeek * days.length / 7) : 0;
  const chartDays = days.map((day) => ({ ...day, label: new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", days.length <= 7 ? { weekday: "short" } : { day: "2-digit", month: "2-digit" }).replace(".", "") }));
  const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  const periodLabel = !error ? `${formatDate(start)} a ${formatDate(end)}` : "Período inválido";

  const exportCsv = () => {
    if (!days.length || error) return;
    const rows: (string | number)[][] = [
      ["Relatório demonstrativo MesaFlow"],
      ["Período", start, end], ["Cenário", periodScenario === "positive" ? "Positivo" : "Negativo"],
      ["Data", "Faturamento (R$)", "Pedidos concluídos", "Ticket médio (R$)", "Mesas atendidas"],
      ...days.map((day) => [day.date, day.revenue.toFixed(2).replace(".", ","), day.orders, (day.orders ? day.revenue / day.orders : 0).toFixed(2).replace(".", ","), day.tables]),
      ["Total", periodRevenue.toFixed(2).replace(".", ","), periodOrders, periodAverageTicket.toFixed(2).replace(".", ","), periodTables],
      [], ["Indicador", "Variação demonstrativa (%)"],
      ...["Faturamento", "Pedidos concluídos", "Ticket médio"].map((label, index) => [label, exportSummary.changes[index]]),
      [], ["Produto", "Quantidade"], ...periodProducts.map((product) => [product.name, product.quantity]),
      [], ["Resumo operacional", "Valor"], ["Taxa de ocupação (%)", exportSummary.occupancy], ["Tempo médio de preparo (min)", exportSummary.preparation], ["Cancelamentos", exportCancellations], ["Categorias ativas", 8],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mesaflow-relatorios-${start}-${end}-${periodScenario}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return { selectedDay, selectDay, clearSelectedDay, formatDate, period, setPeriod, scenario, startDate, setStartDate, endDate, setEndDate, search, setSearch,
    today, error, days, revenue, orders, tables, averageTicket, summary, cancellations, chartDays, products: filteredProducts, periodLabel, exportCsv, formatCurrency };
}
