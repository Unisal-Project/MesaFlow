import { Button } from "@/components";

import {
  tables,
  tableLabels,
} from "../mocks/dashboard.mock";

type TableOverviewProps = {
  onViewTables: () => void;
};

export function TableOverview({ onViewTables }: TableOverviewProps) {
  return (
    <section
      className="mf-dashboard-panel"
      aria-labelledby="tables-title"
    >
      <div className="mf-dashboard-panel-heading">
        <div>
          <h2 id="tables-title">Mapa rápido das mesas</h2>
          <p>Ocupação das mesas</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="small"
          className="mf-dashboard-view-tables"
          onClick={onViewTables}
        >
          Ver mesas →
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
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>{status === "available" ? "Livre" : status === "payment" ? "Conta" : tableLabels[status]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}