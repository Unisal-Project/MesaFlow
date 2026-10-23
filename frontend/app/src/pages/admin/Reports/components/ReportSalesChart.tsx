import { hasLowSales } from "../utils/report.utils";
import type { ReportDay } from "../types/report.types";
import { formatCurrency, toDateKey } from "../../Order/utils/order.utils";

type Props = {
  days: (ReportDay & { label: string })[];
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
};

export function ReportSalesChart({ days, selectedDate, onSelectDay }: Props) {
  const today = toDateKey(new Date());
  const average = days.length ? days.reduce((total, day) => total + day.revenue, 0) / days.length : 0;
  const max = Math.max(1, ...days.map((day) => day.revenue));
  const step = 700 / Math.max(1, days.length);
  const width = Math.min(52, step * .55);
  const labelInterval = Math.ceil(days.length / 7);
  return (
    <section className="reports-panel reports-sales" aria-labelledby="reports-sales-title">
      <header className="reports-panel-heading">
        <div><h2 id="reports-sales-title">Vendas por período</h2><p>Selecione um dia para ver seus produtos mais vendidos</p></div>
        <span className="reports-chart-unit">Receita · R$</span>
      </header>
      {days.length > 0 && <div className="reports-chart-legend">
        {days.some((day) => day.date === today) && <span><i className="reports-legend-today" aria-hidden="true" />Hoje</span>}
        <span title="Sem vendas ou faturamento abaixo de 50% da média diária do período"><i className="reports-legend-low" aria-hidden="true" />Vendas muito baixas</span>
      </div>}
      {days.length ? <svg key={days.map((day) => day.date).join()} className="reports-chart" viewBox="0 0 700 245" role="group" aria-label="Vendas diárias. Selecione uma barra para filtrar os produtos por dia.">
        {[30, 80, 130, 180].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} className="reports-grid-line" />)}
        {days.map((day, index) => {
          const height = Math.max(3, day.revenue / max * 165);
          const isToday = day.date === today;
          const isLow = hasLowSales(day.revenue, average);
          const description = `${isToday ? "Hoje. " : ""}${isLow ? day.revenue === 0 ? "Sem vendas. " : "Atenção: faturamento abaixo de 50% da média diária do período. " : ""}`;
          const x = step * (index + .5);
          const selected = selectedDate === day.date;
          const dateLabel = new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
          return <g key={day.date} role="button" tabIndex={0} aria-pressed={selected}
            aria-label={`${dateLabel}: ${formatCurrency(day.revenue)}. ${description}Ver produtos mais vendidos.`}
            className={`reports-chart-day${selected ? " is-selected" : ""}${selectedDate && !selected ? " is-muted" : ""}${isToday ? " is-today" : ""}${isLow ? " is-low" : ""}`}
            onClick={() => onSelectDay(day.date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectDay(day.date); }
            }}>
            <title>{dateLabel}: {formatCurrency(day.revenue)}. {description}</title>
            <rect className="reports-chart-target" x={step * index} y="25" width={step} height="220" />
            <rect x={x - width / 2} y={215 - height} width={width} height={height} rx={Math.min(9, width / 4)} className="reports-chart-bar" />
            {isLow && <text className="reports-low-marker" x={x} y={Math.max(18, 205 - height)} textAnchor="middle" aria-hidden="true">!</text>}
            {(index % labelInterval === 0 || index === days.length - 1) && <text x={x} y="242" textAnchor="middle">{day.label}</text>}
          </g>;
        })}
      </svg> : <p className="reports-empty">Nenhuma venda no período selecionado.</p>}
    </section>
  );
}
