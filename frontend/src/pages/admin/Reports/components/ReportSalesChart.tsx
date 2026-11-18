import { useRef, useState } from "react";
import { hasLowSales } from "../utils/report.utils";
import type { ReportDay } from "../types/report.types";
import { formatCurrency } from "../../Order/utils/order.utils";
import { businessToday } from "@/utils/businessDay";

/** Uma barra: um dia ou, em períodos longos, uma semana/mês (`fullLabel` descreve qual). */
type ChartDay = Pick<ReportDay, "date" | "revenue"> & { label: string; fullLabel: string };

type Props = {
  days: ChartDay[];
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  /** Período inválido ou erro: não mostra "nenhuma venda" como se fosse dado. */
  unavailable?: boolean;
};

/**
 * Rótulo a cada `every` barras; o último sempre aparece, e o rótulo anterior que
 * ficaria a menos de `every` barras dele é descartado (senão os dois se sobrepõem).
 */
const showLabel = (index: number, every: number, last: number) =>
  index === last || (index % every === 0 && last - index >= every);

export function ReportSalesChart({ days, selectedDate, onSelectDay, unavailable = false }: Props) {
  // Roving tabindex: o gráfico é UMA parada de Tab; ←/→ (Home/End) trocam de barra.
  const [focusIndex, setFocusIndex] = useState(0);
  const bars = useRef<(SVGGElement | null)[]>([]);
  const selectedIndex = days.findIndex((day) => day.date === selectedDate);
  const activeIndex = Math.min(selectedIndex >= 0 ? selectedIndex : focusIndex, Math.max(0, days.length - 1));
  const moveFocus = (index: number) => {
    setFocusIndex(index);
    bars.current[index]?.focus();
  };
  const today = businessToday();
  const average = days.length ? days.reduce((total, day) => total + day.revenue, 0) / days.length : 0;
  const max = Math.max(1, ...days.map((day) => day.revenue));
  const step = 700 / Math.max(1, days.length);
  const width = Math.min(52, step * .55);
  // Rótulos: 7 no desktop e 4 no celular (o SVG encolhe ~0,4×: mais rótulos ficam ilegíveis).
  const labelEvery = Math.ceil(days.length / 7);
  const labelEveryPhone = Math.ceil(days.length / 4);
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
          const dateLabel = day.fullLabel;
          return <g key={day.date} ref={(element) => { bars.current[index] = element; }} role="button" tabIndex={index === activeIndex ? 0 : -1} aria-pressed={selected}
            onFocus={() => setFocusIndex(index)}
            aria-label={`${dateLabel}: ${formatCurrency(day.revenue)}. ${description}Ver produtos mais vendidos.`}
            className={`reports-chart-day${selected ? " is-selected" : ""}${selectedDate && !selected ? " is-muted" : ""}${isToday ? " is-today" : ""}${isLow ? " is-low" : ""}`}
            onClick={() => onSelectDay(day.date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectDay(day.date); }
              const target = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? days.length - 1 : null;
              if (target !== null && target >= 0 && target < days.length) { event.preventDefault(); moveFocus(target); }
            }}>
            <title>{dateLabel}: {formatCurrency(day.revenue)}. {description}</title>
            <rect className="reports-chart-target" x={step * index} y="25" width={step} height="220" />
            <rect x={x - width / 2} y={215 - height} width={width} height={height} rx={Math.min(9, width / 4)} className="reports-chart-bar" />
            {isLow && <text className="reports-low-marker" x={x} y={Math.max(18, 205 - height)} textAnchor="middle" aria-hidden="true">!</text>}
            {(() => {
              const wide = showLabel(index, labelEvery, days.length - 1);
              const narrow = showLabel(index, labelEveryPhone, days.length - 1);
              return (wide || narrow) && <text x={x} y="242" textAnchor="middle" data-wide={wide || undefined} data-narrow={narrow || undefined} aria-hidden="true">{day.label}</text>;
            })()}
          </g>;
        })}
      </svg> : <p className="reports-empty">{unavailable ? "Gráfico indisponível: corrija o período." : "Nenhuma venda no período selecionado."}</p>}
    </section>
  );
}
