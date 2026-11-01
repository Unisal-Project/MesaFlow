import { 
  ArrowUpRight,
  ChartNoAxesCombined,
  ClipboardList,
  Check,
  Eye,
  Search,
  UtensilsCrossed
} from "lucide-react";

import { AdminSidebar, Button, StatCard, Notifications } from "@/components";

import { TableOverview } from "./components/TableOverview";
import { KitchenQueue } from "./components/KitchenQueue";

import { useDashboard } from "./hooks/useDashboard";

import type {
  DashboardProps
} from "./types/dashboard.types";

import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";

import "./styles.scss";

const indicatorIcons = [ChartNoAxesCombined, ClipboardList, UtensilsCrossed, ArrowUpRight];

export default function Dashboard({ onNavigate, onViewOrders, onViewReports, onViewOrder }: DashboardProps) {
  const {
    today,
    indicators,
  } = useDashboard();

  return (
    <div className="mf-dashboard">
      <AdminSidebar
        activeId="dashboard"
        brandSubtitle="GESTÃO DO RESTAURANTE"
        navigationLabel="MENU PRINCIPAL"
        showAvatar
        brandImage={<img src={logoAlternativo} alt="" />}
        onChange={(id) => onNavigate?.(id)}
        userName="Nome do usuário"
        userRole="Administrador"
      />

      <main className="mf-dashboard-main">
        <header className="mf-dashboard-header">
          <div className="mf-dashboard-breadcrumb" aria-label="Página atual">
            <span>Visão geral</span><strong>/ &nbsp;Dashboard</strong>
          </div>
          <div className="mf-dashboard-tools">
            <label className="mf-dashboard-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar pedidos, mesas ou produtos"
                placeholder="Buscar pedidos, mesas ou produtos"
              />
            </label>
            <Notifications items={[]} />
          </div>
        </header>

        <div className="mf-dashboard-body">
          <section className="mf-dashboard-intro" aria-labelledby="dashboard-title">
            <div>
              <h1 id="dashboard-title">Bom dia, equipe!</h1>
              <p>Veja o que está acontecendo no seu restaurante hoje.</p>
            </div>
            <time dateTime={today}>
              {new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </time>
          </section>

          <section
            className="mf-dashboard-indicators"
            aria-label="Indicadores da operação"
          >
            {indicators.map(({ label, value, detail }, index) => {
              const Icon = indicatorIcons[index];
              return <StatCard key={label} label={label} value={value} trend={detail} icon={<Icon aria-hidden="true" size={24} />} />;
            })}
          </section>

          <div className="mf-dashboard-content">
            <KitchenQueue onViewOrders={onViewOrders} onViewOrder={onViewOrder} />

            <TableOverview
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
