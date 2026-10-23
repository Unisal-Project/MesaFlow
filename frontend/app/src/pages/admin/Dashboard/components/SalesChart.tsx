import { currency } from "../utils/dashboard.utils";

type SalesDay = {
  value: number;
  label: string;
};

type SalesChartProps = {
  chartPeriod: number;
  setChartPeriod: (period: number) => void;
  chartPeriods: number[];
  salesDays: SalesDay[];
};

export function SalesChart({
  chartPeriod,
  setChartPeriod,
  chartPeriods,
  salesDays,
}: SalesChartProps) {
  const maxSales = Math.max(...salesDays.map((day) => day.value));

  return (
    <section
      className="mf-dashboard-panel mf-dashboard-analytics-card"
      aria-labelledby="dashboard-analytics-sales-title"
    >
      <div className="mf-dashboard-panel-heading mf-dashboard-analytics-heading">
        <h2 id="dashboard-analytics-sales-title">
          Vendas por período
        </h2>

        <label className="mf-dashboard-period-filter mf-dashboard-analytics-period">
          <span>Período das vendas</span>

          <select
            value={chartPeriod}
            onChange={(event) =>
              setChartPeriod(Number(event.target.value))
            }
          >
            {chartPeriods.map((days) => (
              <option key={days} value={days}>
                Últimos {days} dias
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="mf-dashboard-analytics-chart"
        style={{
          gridTemplateColumns: `repeat(${salesDays.length}, minmax(28px, 1fr))`,
        }}
        tabIndex={0}
        role="img"
        aria-label={`Vendas demonstrativas dos últimos ${chartPeriod} dias. ${salesDays
          .map(({ label, value }) => `${label}: ${currency(value)}`)
          .join("; ")}.`}
      >
        {salesDays.map(({ label, value }) => (
          <div
            className="mf-dashboard-analytics-chart-column"
            key={label}
            aria-hidden="true"
          >
            <div className="mf-dashboard-analytics-bar-track">
              <div
                className="mf-dashboard-analytics-bar"
                style={{
                  height: `${maxSales > 0 ? (value / maxSales) * 100 : 0}%`,
                }}
                title={`${label}: ${currency(value)}`}
              />
            </div>

            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}