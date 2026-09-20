import { useState } from "react";
import { Bell, Info, Search } from "lucide-react";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { StatCard } from "@/components/cards/StatCard";
import { Badge } from "@/components/status/Badge";
import { Button } from "@/components/buttons/Button";
import { IconButton } from "@/components/buttons/IconButton";
import "./styles.css";

// Dados demonstrativos locais para a representação visual do Dashboard.
const weeklySales = [4200, 5800, 4900, 7200, 6100, 8400, 7500];
const chartSalesHistory = Array.from({ length: 30 }, (_, index) => {
  const daysAgo = 29 - index;
  return weeklySales[6 - (daysAgo % 7)];
});
const chartPeriods = [7, 14, 30];
const topProducts = [
  { name: "Risoto de cogumelos", quantity: 42 },
  { name: "Nhoque artesanal", quantity: 36 },
  { name: "Limonada com hortelã", quantity: 31 },
  { name: "Pudim de doce de leite", quantity: 24 },
];
const operationalSummary = [
  { label: "Tempo médio de preparo", value: "18 min" },
  { label: "Mesas atendidas", value: "52" },
  { label: "Pedidos cancelados", value: "2" },
  { label: "Pagamentos concluídos", value: "47" },
];

type DashboardPeriod = "today" | "7days" | "30days" | "all" | "specific";

const dateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

// Histórico demonstrativo local, sem integração com serviços.
const salesHistory = [
  { date: dateDaysAgo(0), sales: 8420, ticket: 96.4, orders: 87 },
  { date: dateDaysAgo(1), sales: 7518, ticket: 92.7, orders: 81 },
  { date: dateDaysAgo(4), sales: 6240, ticket: 89.14, orders: 70 },
  { date: dateDaysAgo(12), sales: 9150, ticket: 101.67, orders: 90 },
  { date: dateDaysAgo(35), sales: 5680, ticket: 88.75, orders: 64 },
];

const currency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const orders = [
  {
    id: 1842,
    description:
      "Mesa 08 · 2x Risoto de cogumelos, 1x Limonada com hortelã, 1x Pudim de doce de leite",
    status: "Em preparo",
    tone: "blue",
  },
  {
    id: 1843,
    description: "Mesa 12 · 2x Nhoque artesanal",
    status: "Aguardando",
    tone: "amber",
  },
];

const tables = [
  "available",
  "occupied",
  "occupied",
  "available",
  "payment",
  "available",
  "occupied",
  "occupied",
  "available",
  "payment",
];
const tableLabels: Record<string, string> = {
  available: "Disponível",
  occupied: "Ocupada",
  payment: "Aguardando pagamento",
};

type DashboardProps = { onNavigate?: (id: string) => void };

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [chartPeriod, setChartPeriod] = useState(7);
  const salesDays = chartSalesHistory.slice(-chartPeriod).map((value, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (chartPeriod - 1 - index));
    return {
      value,
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    };
  });


  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [specificDate, setSpecificDate] = useState(() => dateDaysAgo(0));
  const today = dateDaysAgo(0);
  const startDate = dateDaysAgo(
    period === "7days" ? 6 : period === "30days" ? 29 : 0,
  );
  const selectedSales = salesHistory.filter(({ date }) => {
    if (period === "all") return true;
    if (period === "specific") return date === specificDate;
    return date >= startDate && date <= today;
  });
  const totalSales = selectedSales.reduce((total, day) => total + day.sales, 0);
  const totalOrders = selectedSales.reduce(
    (total, day) => total + day.orders,
    0,
  );
  const averageTicket = totalOrders
    ? selectedSales.reduce((total, day) => total + day.ticket * day.orders, 0) /
      totalOrders
    : 0;
  const periodDetail = selectedSales.length
    ? "No período selecionado"
    : "Sem vendas no período";
  const indicators = [
    {
      label: period === "today" ? "Vendas hoje" : "Vendas no período",
      value: totalSales.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }),
      detail: period === "today" ? "+12% vs. ontem" : periodDetail,
    },
    { label: "Pedidos ativos", value: "3", detail: "3 em preparo agora" },
    { label: "Mesas ocupadas", value: "14/20", detail: "70% do salão agora" },
    {
      label: "Ticket médio",
      value: currency(averageTicket),
      detail: period === "today" ? "+4% na semana" : periodDetail,
    },
  ];

  return (
    <div className="mf-dashboard">
      <AdminSidebar
        activeId="dashboard"
        onChange={(id) => onNavigate?.(id)}
        userName="Nome do usuário"
        userRole="Administrador"
      />

      <main className="mf-dashboard-main">
        <header className="mf-dashboard-header">
          <div>
            <p className="mf-dashboard-eyebrow">OPERAÇÃO</p>
            <h1>Dashboard</h1>
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
            <IconButton
              className="mf-dashboard-notifications"
              type="button"
              label="Notificações: há uma nova notificação"
            >
              <Bell aria-hidden="true" />
              <span />
            </IconButton>
          </div>
        </header>

        <div className="mf-dashboard-filters">
          <label className="mf-dashboard-period-filter">
            <span>Período</span>
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as DashboardPeriod)
              }
            >
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="all">Todos os dias</option>
              <option value="specific">Dia específico</option>
            </select>
          </label>
          {period === "specific" && (
            <label className="mf-dashboard-specific-date">
              <span>Escolha o dia</span>
              <input
                type="date"
                value={specificDate}
                max={today}
                onChange={(event) => setSpecificDate(event.target.value)}
              />
            </label>
          )}
          <span className="mf-dashboard-period-help">
            <button
              type="button"
              aria-label="Informações sobre o período"
              aria-describedby="dashboard-period-tooltip"
            >
              <Info aria-hidden="true" />
            </button>
            <span id="dashboard-period-tooltip" role="tooltip">
              O período se aplica às vendas e ao ticket médio. A operação mostra
              a situação atual.
            </span>
          </span>
        </div>

        <section
          className="mf-dashboard-indicators"
          aria-label="Indicadores da operação"
        >
          {indicators.map(({ label, value, detail }) => (
            <StatCard key={label} label={label} value={value} trend={detail} />
          ))}
        </section>

        <div className="mf-dashboard-content">
          <section
            className="mf-dashboard-panel"
            aria-labelledby="kitchen-title"
          >
            <div className="mf-dashboard-panel-heading">
              <h2 id="kitchen-title">Fila da cozinha</h2>
              <Badge variant="info">Ao vivo</Badge>
            </div>
            <div className="mf-dashboard-orders">
              {orders.map((order) => (
                <article className="mf-dashboard-order" key={order.id}>
                  <div>
                    <h3>Pedido #{order.id}</h3>
                    <p>{order.description}</p>
                  </div>
                  <Badge variant={order.tone === "blue" ? "prep" : "wait"}>
                    {order.status}
                  </Badge>
                </article>
              ))}
            </div>
          </section>

          <section
            className="mf-dashboard-panel"
            aria-labelledby="tables-title"
          >
            <div className="mf-dashboard-panel-heading">
              <h2 id="tables-title">Mapa rápido de mesas</h2>
              <Button
                type="button"
                variant="ghost"
                size="small"
                className="mf-dashboard-view-tables"
                onClick={() => onNavigate?.("tables")}
              >
                Ver todas
              </Button>
            </div>
            <div
              className="mf-dashboard-table-grid"
              aria-label="Situação das mesas"
            >
              {tables.map((status, index) => (
                <div
                  key={index + 1}
                  className={`mf-dashboard-table ${status}`}
                  title={`Mesa ${index + 1}: ${tableLabels[status]}`}
                  aria-label={`Mesa ${index + 1}: ${tableLabels[status]}`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mf-dashboard-analytics-grid">
          <section className="mf-dashboard-panel mf-dashboard-analytics-card" aria-labelledby="dashboard-analytics-sales-title">
            <div className="mf-dashboard-panel-heading mf-dashboard-analytics-heading">
              <h2 id="dashboard-analytics-sales-title">Vendas por período</h2>
              <label className="mf-dashboard-period-filter mf-dashboard-analytics-period">
                <span>Período das vendas</span>
                <select
                  value={chartPeriod}
                  onChange={(event) => setChartPeriod(Number(event.target.value))}
                >
                  {chartPeriods.map((days) => (
                    <option key={days} value={days}>Últimos {days} dias</option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className="mf-dashboard-analytics-chart"
              style={{ gridTemplateColumns: `repeat(${salesDays.length}, minmax(28px, 1fr))` }}
              tabIndex={0}
              role="img"
              aria-label={`Vendas demonstrativas dos últimos ${chartPeriod} dias. ${salesDays.map(({ label, value }) => `${label}: ${currency(value)}`).join("; ")}.`}
            >
              {salesDays.map(({ label, value }) => (
                <div className="mf-dashboard-analytics-chart-column" key={label} aria-hidden="true">
                  <div className="mf-dashboard-analytics-bar-track">
                    <div
                      className="mf-dashboard-analytics-bar"
                      style={{ height: `${(value / Math.max(...salesDays.map((day) => day.value))) * 100}%` }}
                      title={`${label}: ${currency(value)}`}
                    />
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mf-dashboard-panel mf-dashboard-analytics-card" aria-labelledby="dashboard-analytics-products-title">
            <div className="mf-dashboard-panel-heading">
              <h2 id="dashboard-analytics-products-title">Produtos mais vendidos</h2>
            </div>
            <ol className="mf-dashboard-analytics-ranking">
              {topProducts.map(({ name, quantity }, index) => (
                <li className="mf-dashboard-analytics-row" key={name}>
                  <span className="mf-dashboard-analytics-rank" aria-hidden="true">{index + 1}</span>
                  <span className="mf-dashboard-analytics-product">{name}</span>
                  <strong>{quantity} un.</strong>
                </li>
              ))}
            </ol>
          </section>

          <section className="mf-dashboard-panel mf-dashboard-analytics-card" aria-labelledby="dashboard-analytics-summary-title">
            <div className="mf-dashboard-panel-heading">
              <h2 id="dashboard-analytics-summary-title">Resumo operacional</h2>
            </div>
            <dl className="mf-dashboard-analytics-summary">
              {operationalSummary.map(({ label, value }) => (
                <div className="mf-dashboard-analytics-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
