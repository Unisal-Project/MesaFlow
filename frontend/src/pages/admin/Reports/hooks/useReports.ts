import { useEffect, useState } from "react";
import { fetchSalesReport, type SalesReport } from "@/services/orders.service";
import { dateDaysAgo, formatCurrency } from "../../Order/utils/order.utils";
import { bucketReportDays, hasLowSales, rankProducts } from "../utils/report.utils";
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
  // null = padrão: acompanha o dia de operação (a virada de /settings chega depois da montagem).
  const [chosenStart, setStartDateValue] = useState<string | null>(null);
  const [chosenEnd, setEndDateValue] = useState<string | null>(null);
  const startDate = chosenStart ?? dateDaysAgo(6);
  const endDate = chosenEnd ?? dateDaysAgo(0);
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

  // Períodos longos agrupam por semana/mês; a barra selecionada cobre vários dias.
  const buckets = bucketReportDays(days);
  const selectedDay = buckets.find((bucket) => bucket.date === selectedDate) ?? null;
  const scope = selectedDay ? selectedDay.days : days;
  const revenue = sum("revenue", scope);
  const orders = sum("orders", scope);
  const tables = sum("tables", scope);
  const averageTicket = orders ? revenue / orders : 0;

  // Período: compara com o anterior de mesmo tamanho. Barra: com a média do período (por dia × dias da barra).
  const previous = current?.previous;
  const changes = selectedDay
    ? [
        percentChange(revenue, periodDailyAverage * scope.length),
        percentChange(orders, days.length ? (periodOrders / days.length) * scope.length : 0),
        percentChange(averageTicket, periodTicket),
      ]
    : [
        percentChange(revenue, previous?.revenue ?? 0),
        percentChange(orders, previous?.orders ?? 0),
        percentChange(averageTicket, previous?.orders ? previous.revenue / previous.orders : 0),
      ];
  const scenario = selectedDay
    ? hasLowSales(selectedDay.revenue / scope.length, periodDailyAverage) ? "negative" : "positive"
    : (changes[0] ?? 0) < 0 ? "negative" : "positive";

  const methods = new Map<string, number>();
  for (const day of scope)
    Object.entries(day.payments).forEach(([method, value]) => methods.set(method, (methods.get(method) ?? 0) + (value ?? 0)));
  // Por productId: nomes repetidos não se misturam e um produto renomeado aparece com o nome atual.
  const products = rankProducts(scope);
  const summary = {
    serviceFee: sum("serviceFee", scope),
    cancellations: sum("cancellations", scope),
    topMethod: topMethodLabel(methods),
    activeCategories: current?.activeCategories ?? 0,
  };

  const selectDay = (date: string) => setSelectedDate((value) => value === date ? null : date);
  const clearSelectedDay = () => setSelectedDate(null);
  const filteredProducts = products.filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  const bucketLabel = (bucket: (typeof buckets)[number]) => {
    const first = bucket.days[0].date;
    const last = bucket.days[bucket.days.length - 1].date;
    const at = (options: Intl.DateTimeFormatOptions) => new Date(`${first}T12:00:00`).toLocaleDateString("pt-BR", options).replace(".", "");
    return {
      // Rótulo curto no eixo e descrição completa para leitores de tela/dica.
      label: bucket.kind === "day" ? at(days.length <= 7 ? { weekday: "short" } : { day: "2-digit", month: "2-digit" })
        : bucket.kind === "week" ? at({ day: "2-digit", month: "2-digit" }) : `${at({ month: "short" })}/${at({ year: "2-digit" })}`,
      fullLabel: bucket.kind === "day" ? at({ weekday: "long", day: "2-digit", month: "long" })
        : bucket.kind === "week" ? `Semana de ${formatDate(first)} a ${formatDate(last)}` : at({ month: "long", year: "numeric" }),
    };
  };
  const chartDays = buckets.map((bucket) => ({
    // Uma "barra": soma do que ela cobre (um dia, uma semana ou um mês).
    date: bucket.date, revenue: bucket.revenue, ...bucketLabel(bucket),
  }));
  // Dia: "01/11/2026"; barra agrupada: "01/11/2026 a 07/11/2026".
  const selectedLabel = selectedDay ? selectedDay.kind === "day" ? formatDate(selectedDay.date) : `${formatDate(selectedDay.days[0].date)} a ${formatDate(selectedDay.days[selectedDay.days.length - 1].date)}` : "";
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
      ...rankProducts(days).map((product) => [product.name, product.quantity]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mesaflow-relatorios-${start}-${end}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return { selectedDay, selectedLabel, selectDay, clearSelectedDay, formatDate, period, setPeriod, scenario, startDate, setStartDate, endDate, setEndDate, search, setSearch,
    today, error, loading: loading || (!error && !current), days, hasSales, revenue, orders, tables, averageTicket, changes, summary, chartDays, products: filteredProducts, periodLabel, exportCsv, formatCurrency };
}
