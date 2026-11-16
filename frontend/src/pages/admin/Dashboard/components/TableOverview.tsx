import { Button } from "@/components";

import type { RestaurantTable } from "../../Table/types/table.types";

// As classes de cor do mapa agrupam os quatro status da mesa em três.
const view = (table: RestaurantTable) =>
  table.status === "available"
    ? { tone: "available", label: "Disponível", short: "Livre" }
    : table.status === "occupied"
      ? { tone: "occupied", label: "Ocupada", short: "Ocupada" }
      : { tone: "payment", label: "Aguardando pagamento", short: "Conta" };

type TableOverviewProps = {
  tables: RestaurantTable[];
  onViewTables: () => void;
  /** Clicar numa mesa do mapa abre os detalhes dela em Mesas. */
  onOpenTable?: (table: RestaurantTable) => void;
};

export function TableOverview({ tables, onViewTables, onOpenTable }: TableOverviewProps) {
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
        {tables
          .filter((table) => table.active)
          .map((table) => {
            const { tone, label, short } = view(table);
            return (
              <button
                type="button"
                key={table.id}
                className={`mf-dashboard-table ${tone}`}
                title={`${table.name}: ${label}`}
                aria-label={`Ver ${table.name}: ${label}`}
                onClick={() => onOpenTable?.(table)}
              >
                <strong>{String(table.number).padStart(2, "0")}</strong>
                <span>{short}</span>
              </button>
            );
          })}
        {tables.length === 0 && <p>Nenhuma mesa cadastrada.</p>}
      </div>
    </section>
  );
}