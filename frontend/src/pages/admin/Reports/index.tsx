import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight, ChevronDown, Download, Search, Utensils } from "lucide-react";
import { AdminSidebar, Button, Notifications, StatCard } from "@/components";
import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";
import { useReports } from "./hooks/useReports";
import { ReportSalesChart } from "./components/ReportSalesChart";
import type { ReportPeriod } from "./types/report.types";
import "./styles.scss";

type ReportsProps = { onNavigate: (id: string) => void };

export default function Reports({ onNavigate }: ReportsProps) {
  const report = useReports();
  const negative = report.scenario === "negative";
  const Direction = negative ? ArrowDown : ArrowUp;
  const TicketDirection = negative ? ArrowDownLeft : ArrowUpRight;
  const metrics = [
    { label: "Faturamento", value: report.formatCurrency(report.revenue), icon: <Direction aria-hidden="true" /> },
    { label: "Pedidos concluídos", value: String(report.orders), icon: <Direction aria-hidden="true" /> },
    { label: "Ticket médio", value: report.formatCurrency(report.averageTicket), icon: <TicketDirection aria-hidden="true" /> },
    { label: "Mesas atendidas", value: String(report.tables), icon: <Utensils aria-hidden="true" /> },
  ];
  return (
    <div className="reports-page">
      <AdminSidebar activeId="reports" brandSubtitle="GESTÃO DO RESTAURANTE" navigationLabel="MENU PRINCIPAL" showAvatar
        brandImage={<img src={logoAlternativo} alt="" />} onChange={onNavigate} userName="Nome do usuário" userRole="Administrador" />
      <main className="reports-content">
        <header className="reports-topbar">
          <div className="reports-breadcrumb" aria-label="Página atual"><span>Visão geral</span><strong>/ &nbsp;Relatórios</strong></div>
          <div className="reports-topbar-actions">
            <label className="reports-search"><Search aria-hidden="true" />
              <input type="search" aria-label="Buscar produto no relatório" placeholder="Buscar produto no relatório..." value={report.search} onChange={(event) => report.setSearch(event.target.value)} />
            </label>
            <Notifications items={[]} />
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
            <p>Dados demonstrativos <span aria-hidden="true">·</span> {report.periodLabel}</p>
            {report.selectedDay && <p className="reports-selected-context" role="status">Dia selecionado: {report.formatDate(report.selectedDay.date)}{negative ? " · Vendas muito baixas" : ""}</p>}
          </div>
          {report.period === "custom" && <div className="reports-dates">
            <label>Data inicial<input type="date" value={report.startDate} max={report.today} onChange={(event) => report.setStartDate(event.target.value)} /></label>
            <label>Data final<input type="date" value={report.endDate} max={report.today} onChange={(event) => report.setEndDate(event.target.value)} /></label>
          </div>}
          {report.error && <p className="reports-error" role="alert">{report.error}</p>}
          <section className="reports-indicators" key={report.selectedDay?.date ?? report.periodLabel} aria-label={report.selectedDay ? "Indicadores do dia selecionado" : "Indicadores do período"} aria-live="polite">
            {metrics.map((metric, index) => <div key={metric.label} className={`reports-indicator${index === 3 ? " is-tables" : negative && report.days.length ? " is-negative" : ""}`}>
              <StatCard {...metric} trend={index === 3 ? report.selectedDay ? "No dia selecionado" : "No período" : report.days.length ? `${report.summary.changes[index] > 0 ? "+ " : "− "}${Math.abs(report.summary.changes[index]).toLocaleString("pt-BR")}%` : "Sem dados no período"} />
            </div>)}
          </section>
          <div className="reports-grid">
            <ReportSalesChart days={report.chartDays} selectedDate={report.selectedDay?.date ?? null} onSelectDay={report.selectDay} />
            <section className="reports-panel reports-products" aria-labelledby="reports-products-title">
              <header className="reports-panel-heading"><div><h2 id="reports-products-title">Produtos mais vendidos</h2><p aria-live="polite">{report.selectedDay ? `Mais vendidos em ${report.formatDate(report.selectedDay.date)}` : "Itens com maior saída no período"}</p></div></header>
              {report.selectedDay && <div className="reports-day-detail">
                <span>{report.formatCurrency(report.selectedDay.revenue)} <span>em vendas no dia</span></span>
                <button type="button" onClick={report.clearSelectedDay}>Ver período completo</button>
              </div>}
              <ol className="reports-ranking" key={report.selectedDay?.date ?? report.periodLabel}>
                {report.products.map((product, index) => <li key={product.name}>
                  <span className="reports-rank">{String(index + 1).padStart(2, "0")}</span>
                  <div><div className="reports-ranking-label"><strong>{product.name}</strong><span>{product.quantity} un.</span></div>
                    <progress max={Math.max(1, ...report.products.map((item) => item.quantity))} value={product.quantity} aria-label={`${product.name}: ${product.quantity} unidades`} />
                  </div>
                </li>)}
              </ol>
              {!report.products.length && <p className="reports-empty">{report.days.length ? "Nenhum produto encontrado para esta busca." : "Nenhum produto vendido no período."}</p>}
            </section>
          </div>
          <section className={`reports-panel reports-summary${negative ? " is-negative" : ""}`} aria-labelledby="reports-summary-title">
            <header className="reports-panel-heading"><div><h2 id="reports-summary-title">Resumo operacional</h2><p>{report.selectedDay ? `Desempenho em ${report.formatDate(report.selectedDay.date)}` : "Uma leitura rápida do desempenho no período"}</p></div></header>
            <dl>
              <div><dt>Taxa de ocupação</dt><dd>{report.days.length ? `${report.summary.occupancy}%` : "—"}</dd></div>
              <div><dt>Tempo médio de preparo</dt><dd>{report.days.length ? `${report.summary.preparation} min` : "—"}</dd></div>
              <div><dt>Cancelamentos</dt><dd>{String(report.cancellations).padStart(2, "0")}</dd></div>
              <div><dt>Categorias ativas</dt><dd>{report.days.length ? "08" : "—"}</dd></div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
