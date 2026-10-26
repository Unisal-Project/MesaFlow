import { operationalSummary } from "../mocks/dashboard.mock";

export function OperationalSummary() {
  return (
    <section
      className="mf-dashboard-panel mf-dashboard-analytics-card"
      aria-labelledby="dashboard-analytics-summary-title"
    >
      <div className="mf-dashboard-panel-heading">
        <h2 id="dashboard-analytics-summary-title">
          Resumo operacional
        </h2>
      </div>

      <dl className="mf-dashboard-analytics-summary">
        {operationalSummary.map(({ label, value }) => (
          <div
            className="mf-dashboard-analytics-row"
            key={label}
          >
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}