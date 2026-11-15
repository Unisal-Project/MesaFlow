import { 
  ArrowUpRight,
  ChartNoAxesCombined,
  ClipboardList,
  Check,
  Eye,
  UtensilsCrossed
} from "lucide-react";

import { AdminSidebar, Button, StatCard, Notifications } from "@/components";

import { TableOverview } from "./components/TableOverview";
import { KitchenQueue } from "./components/KitchenQueue";

import { useDashboard } from "./hooks/useDashboard";
import { dashboardGreeting } from "./utils/dashboard.utils";

import type {
  DashboardProps
} from "./types/dashboard.types";

import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";

import "./styles.scss";

const indicatorIcons = [ChartNoAxesCombined, ClipboardList, UtensilsCrossed, ArrowUpRight];

export default function Dashboard({ orders, tables, loading = false, error = "", onRetry, onNavigate, onViewOrders, onViewReports, onViewOrder }: DashboardProps) {
  const { today, indicators, queue } = useDashboard(orders, tables);
  // Sem dados confiáveis, "—" em vez de zeros que parecem reais.
  // Erro de carga = erro sem nenhum dado; erro de ação (salvar pedido/mesa)
  // chega no mesmo campo e não deve esconder indicadores válidos.
  const loadFailed = Boolean(error) && !orders.length && !tables.length;
  const pending = loading || loadFailed;

  return (
    <div className="mf-dashboard">
      <AdminSidebar
        activeId="dashboard"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        brandImage={<img src={logoAlternativo} alt="" />}
        onChange={(id) => onNavigate?.(id)}
      />

      <main className="mf-dashboard-main">
        <header className="mf-dashboard-header">
          <div className="mf-dashboard-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span><strong>/ &nbsp;Dashboard</strong>
          </div>
          <div className="mf-dashboard-tools">
            <Notifications />
          </div>
        </header>

        <div className="mf-dashboard-body">
          <section className="mf-dashboard-intro" aria-labelledby="dashboard-title">
            <div>
              <h1 id="dashboard-title">{dashboardGreeting(new Date())}</h1>
              <p>Veja o que está acontecendo no seu restaurante hoje.</p>
            </div>
            <time dateTime={today}>
              {new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </time>
          </section>

          {loadFailed && (
            <p className="mf-dashboard-error" role="alert">
              {error}
              {onRetry && (
                <Button type="button" variant="secondary" size="small" onClick={onRetry}>
                  Tentar de novo
                </Button>
              )}
            </p>
          )}
          {loading && <p role="status">Carregando indicadores…</p>}

          <section
            className="mf-dashboard-indicators"
            aria-label="Indicadores da operação"
          >
            {indicators.map(({ label, value, detail }, index) => {
              const Icon = indicatorIcons[index];
              return <StatCard key={label} label={label} value={pending ? "—" : value} trend={pending ? "" : detail} icon={<Icon aria-hidden="true" size={24} />} />;
            })}
          </section>

          <div className="mf-dashboard-content">
            <KitchenQueue orders={queue} onViewOrders={onViewOrders} onViewOrder={onViewOrder} />

            <TableOverview
              tables={tables}
              onViewTables={() => onNavigate?.("tables")}
            />
          </div>

          <section className="mf-dashboard-operation" aria-labelledby="operation-title">
            <span className="mf-dashboard-operation-icon"><Check aria-hidden="true" /></span>
            <div>
              <h2 id="operation-title">Operação em andamento</h2>
              <p>Acompanhe os pedidos e atendimentos do seu restaurante.</p>
            </div>
            <Button type="button" variant="ghost" size="small" className="mf-dashboard-view-action" onClick={onViewReports}>
              <Eye aria-hidden="true" />
              Ver relatórios
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
