import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight, ChevronDown, Download, Search, Undo2, Utensils } from "lucide-react";
import { AdminSidebar, Button, Notifications, StatCard } from "@/components";
import { useReports } from "./hooks/useReports";
import { ReportSalesChart } from "./components/ReportSalesChart";
import type { ReportPeriod } from "./types/report.types";
import "./styles.scss";

type ReportsProps = { onNavigate: (id: string) => void };

/** O painel mostra só os mais vendidos, para não crescer com o cardápio. */
const TOP_PRODUCTS = 8;

const trendLabel = (change: number | null, hasSales: boolean) =>
  !hasSales ? "Sem dados no período"
    : change === null ? "Sem base de comparação"
      : `${change >= 0 ? "+ " : "− "}${Math.abs(change).toLocaleString("pt-BR")}%`;

export default function Reports({ onNavigate }: ReportsProps) {
  const report = useReports();
  const rankedProducts = report.products.slice(0, TOP_PRODUCTS);
  const topQuantity = Math.max(1, ...report.products.map((item) => item.quantity));
  const negative = report.scenario === "negative";
  const Direction = negative ? ArrowDown : ArrowUp;
  const TicketDirection = negative ? ArrowDownLeft : ArrowUpRight;
  // Período inválido ou com erro não tem dados: "—" em vez de zeros que pareceriam vendas reais.
  const invalid = !!report.error;
  const metrics = [
    { label: "Faturamento", value: invalid ? "—" : report.formatCurrency(report.revenue), icon: <Direction aria-hidden="true" /> },
    { label: "Pedidos concluídos", value: invalid ? "—" : String(report.orders), icon: <Direction aria-hidden="true" /> },
    { label: "Ticket médio", value: invalid ? "—" : report.formatCurrency(report.averageTicket), icon: <TicketDirection aria-hidden="true" /> },
    { label: "Mesas atendidas", value: invalid ? "—" : String(report.tables), icon: <Utensils aria-hidden="true" /> },
  ];
  return (
    <div className="reports-page" onKeyDown={(event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing || !report.selectedDay) return;
      const target = event.target as Element;
      if (target.closest?.('dialog, [role="dialog"], .notifications-container, .admin-profile, .admin-sidebar')) return;
      event.preventDefault();
      report.clearSelectedDay();
    }}>
      <AdminSidebar activeId="reports" brandSubtitle="GESTÃO DO RESTAURANTE" navigationLabel="MENU PRINCIPAL" showAvatar
        onChange={onNavigate} />
      <main className="reports-content">
        <header className="reports-topbar">
          <div className="reports-breadcrumb" aria-label="Página atual"><span>Visão geral</span><strong>/ &nbsp;Relatórios</strong></div>
          <div className="reports-topbar-actions">
            <label className="reports-search"><Search aria-hidden="true" />
              <input type="search" aria-label="Buscar produto no relatório" placeholder="Buscar produto no relatório..." value={report.search} onChange={(event) => report.setSearch(event.target.value)} />
            </label>
            <Notifications />
          </div>
        </header>
        <div className="reports-body">
          <header className="reports-heading">
            <div><h1>Relatórios</h1><p>Acompanhe os resultados e descubra oportunidades para seu negócio.</p></div>
            <div className="reports-actions">
              <label className="reports-select">
                <select aria-label="Período do relatório" value={report.period} onChange={(event) => report.setPeriod(event.target.value as ReportPeriod)}>
                  <option value="today">Hoje</option><option value="7days">Últimos 7 dias</option><option value="30days">Últimos 30 dias</option><option value="custom">Personalizado</option>
                </select><ChevronDown aria-hidden="true" />
              </label>
              <Button title="Exportar relatório do período completo" onClick={report.exportCsv} disabled={!report.days.length || !!report.error}>Exportar CSV<Download aria-hidden="true" /></Button>
            </div>
          </header>
          <div className="reports-context">
            <p>{invalid ? report.periodLabel : <>{report.loading ? "Carregando..." : "Comparado ao período anterior"} <span aria-hidden="true">·</span> {report.periodLabel}</>}</p>
            {report.selectedDay && <p className="reports-selected-context" role="status">Selecionado: {report.selectedLabel}{negative ? " · Vendas muito baixas" : ""}</p>}
          </div>
          {report.period === "custom" && <div className="reports-dates">
            <label>Data inicial<input type="date" value={report.startDate} max={report.today} onChange={(event) => report.setStartDate(event.target.value)} /></label>
            <label>Data final<input type="date" value={report.endDate} max={report.today} onChange={(event) => report.setEndDate(event.target.value)} /></label>
          </div>}
          {report.error && <p className="reports-error" role="alert">{report.error}</p>}
          <section className="reports-indicators" key={report.selectedDay?.date ?? report.periodLabel} aria-label={report.selectedDay ? "Indicadores da seleção" : "Indicadores do período"} aria-live="polite">
            {metrics.map((metric, index) => <div key={metric.label} className={`reports-indicator${index === 3 ? " is-tables" : negative && report.hasSales ? " is-negative" : ""}`}>
              <StatCard {...metric} trend={invalid ? "Período inválido" : index === 3 ? report.selectedDay ? "Na seleção" : "No período" : trendLabel(report.changes[index], report.hasSales)} />
            </div>)}
          </section>
          <div className="reports-grid">
            <ReportSalesChart days={report.chartDays} selectedDate={report.selectedDay?.date ?? null} onSelectDay={report.selectDay} unavailable={invalid} />
            <section className="reports-panel reports-products" aria-labelledby="reports-products-title">
              <header className="reports-panel-heading"><div><h2 id="reports-products-title">Produtos mais vendidos</h2><p aria-live="polite">{report.selectedDay ? `Mais vendidos: ${report.selectedLabel}` : "Itens com maior saída no período"}</p></div></header>
              {report.selectedDay && <div className="reports-day-detail">
                <span>{report.formatCurrency(report.selectedDay.revenue)} <span>em vendas na seleção</span></span>
                <Button type="button" variant="secondary" className="reports-reset-selection"
                  aria-keyshortcuts="Escape" onClick={(event) => {
                    event.currentTarget.closest(".reports-page")?.querySelector<SVGElement>('.reports-chart-day[aria-pressed="true"]')?.focus({ preventScroll: true });
                    report.clearSelectedDay();
                  }}>
                  <Undo2 aria-hidden="true" /><span>Voltar ao período completo</span><kbd aria-hidden="true">Esc</kbd>
                </Button>
              </div>}
              <ol className="reports-ranking" key={report.selectedDay?.date ?? report.periodLabel}>
                {rankedProducts.map((product, index) => <li key={product.productId}>
                  <span className="reports-rank">{String(index + 1).padStart(2, "0")}</span>
                  <div><div className="reports-ranking-label"><strong>{product.name}</strong><span>{product.quantity} un.</span></div>
                    <progress max={topQuantity} value={product.quantity} aria-label={`${product.name}: ${product.quantity} unidades`} />
                  </div>
                </li>)}
              </ol>
              {!report.products.length && <p className="reports-empty">{invalid ? "—" : report.days.length && report.search.trim() ? "Nenhum produto encontrado para esta busca." : "Nenhum produto vendido no período."}</p>}
            </section>
          </div>
          <section className={`reports-panel reports-summary${negative ? " is-negative" : ""}`} aria-labelledby="reports-summary-title">
            <header className="reports-panel-heading"><div><h2 id="reports-summary-title">Resumo operacional</h2><p>{report.selectedDay ? `Desempenho: ${report.selectedLabel}` : "Uma leitura rápida do desempenho no período"}</p></div></header>
            <dl>
              <div><dt>Taxa de serviço arrecadada</dt><dd>{report.hasSales ? report.formatCurrency(report.summary.serviceFee) : "—"}</dd></div>
              <div><dt>Forma de pagamento mais usada</dt><dd>{invalid ? "—" : report.summary.topMethod}</dd></div>
              <div><dt>Pedidos cancelados</dt><dd>{invalid ? "—" : String(report.summary.cancellations).padStart(2, "0")}</dd></div>
              <div><dt>Categorias ativas</dt><dd>{report.days.length ? String(report.summary.activeCategories).padStart(2, "0") : "—"}</dd></div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
