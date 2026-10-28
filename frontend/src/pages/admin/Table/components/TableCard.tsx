import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { statusInfo } from "../constants/table.constants";
import type { RestaurantTable } from "../types/table.types";

type TableCardProps = {
  table: RestaurantTable;
  onSelect: (table: RestaurantTable) => void;
};

export function TableCard({ table, onSelect }: TableCardProps) {
  const [now] = useState(Date.now);
  const title = /^Mesa \d+$/i.test(table.name)
    ? `Mesa ${String(table.number).padStart(2, "0")}`
    : table.name;
  return (
    <article className={`table-card ${table.status}`}>
      <button
        type="button"
        className="table-card-main"
        onClick={() => onSelect(table)}
        aria-label={`Ver detalhes da ${table.name}`}
      >
        <div className="table-card-topline">
          <h3>
            {title}
            {!table.active && " (Inativa)"}
          </h3>
          <span className={`table-status ${table.status}`}>
            {table.status === "occupied"
              ? "Ocupada"
              : statusInfo[table.status].label}
          </span>
        </div>
        <div className="table-card-meta">
          <span>
            {!table.active
              ? "Mesa inativa"
              : table.status === "available"
                ? `${table.seats ?? 4} lugares`
                : `${table.people ?? 2} pessoas`}
          </span>
          <span>
            {table.openedAt
              ? `Há ${Math.max(0, Math.floor((now - Date.parse(table.openedAt)) / 60_000))} min`
              : "—"}
          </span>
        </div>
        <span className="table-card-link">
          {table.status === "available" && table.active
            ? "Abrir mesa"
            : "Ver atendimento"}
          <ArrowRight aria-hidden="true" />
        </span>
      </button>
    </article>
  );
}
