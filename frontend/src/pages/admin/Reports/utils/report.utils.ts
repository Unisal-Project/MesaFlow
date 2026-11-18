import type { SalesReportDay } from "@/services/orders.service";
export const hasLowSales = (revenue: number, dailyAverage: number) =>
  revenue === 0 || revenue < dailyAverage * .5;

/** Barra do gráfico: um dia, uma semana ou um mês de dias do relatório. */
export type ReportBucket = {
  /** Primeiro dia do grupo (AAAA-MM-DD): identifica a barra e a seleção. */
  date: string;
  kind: "day" | "week" | "month";
  days: SalesReportDay[];
  revenue: number;
};

const DAY_MS = 86_400_000;
/** Até 31 dias: uma barra por dia. */
export const MAX_DAILY_BARS = 31;
/** Até 26 semanas (182 dias): por semana; acima disso, por mês. */
export const MAX_WEEKLY_DAYS = 182;

/** Segunda-feira da semana de uma data AAAA-MM-DD. */
const weekStart = (date: string) => {
  const time = Date.parse(`${date}T00:00:00Z`);
  const weekday = new Date(time).getUTCDay(); // 0 = domingo
  return new Date(time - ((weekday + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
};

/**
 * Períodos longos ficam ilegíveis com uma barra por dia (366 barras de ~0,75px,
 * cada uma com sua parada de Tab): acima de 31 dias agrupa por semana e, acima
 * de 26 semanas, por mês.
 */
export function bucketReportDays(days: SalesReportDay[]): ReportBucket[] {
  const kind: ReportBucket["kind"] =
    days.length <= MAX_DAILY_BARS ? "day" : days.length <= MAX_WEEKLY_DAYS ? "week" : "month";
  const groups = new Map<string, SalesReportDay[]>();
  for (const day of days) {
    const key = kind === "day" ? day.date : kind === "week" ? weekStart(day.date) : day.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.values()].map((group) => ({
    date: group[0].date,
    kind,
    days: group,
    revenue: group.reduce((total, day) => total + day.revenue, 0),
  }));
}

/** Ranking por produto (productId): nomes repetidos não se misturam; vale o nome atual. */
export function rankProducts(days: SalesReportDay[]) {
  const ranking = new Map<string, { name: string; quantity: number }>();
  for (const day of days)
    for (const product of day.products) {
      const key = product.productId ?? product.name;
      ranking.set(key, { name: product.name, quantity: (ranking.get(key)?.quantity ?? 0) + product.quantity });
    }
  return [...ranking]
    .map(([productId, { name, quantity }]) => ({ productId, name, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}
