import type { RestaurantTable } from "../types/table.types";

type TablesSummaryProps = { tables: RestaurantTable[]; loading: boolean };

export function TablesSummary({ tables, loading }: TablesSummaryProps) {
  const indicators = [
    {
      label: "Total de mesas",
      value: tables.length,
      detail: "Visão geral",
      attention: false,
    },
    {
      label: "Disponíveis",
      value: tables.filter((table) => table.status === "available").length,
      detail: "Mesas livres",
      attention: false,
    },
    {
      label: "Ocupadas",
      value: tables.filter((table) => table.status === "occupied").length,
      detail: "Atendimentos em andamento",
      attention: false,
    },
    {
      label: "Conta solicitada",
      value: tables.filter(
        (table) =>
          table.status === "closing_requested" ||
          table.status === "awaiting_payment",
      ).length,
      detail: "Precisam de atenção",
      attention: true,
    },
  ];
  return (
    <section
      className="tables-indicators"
      aria-label="Indicadores das mesas"
      aria-busy={loading}
    >
      {indicators.map(({ label, value, detail, attention }) => (
        <article
          className={`tables-indicator${attention ? " is-attention" : ""}`}
          key={label}
        >
          <span>{label}</span>
          <strong>{loading ? "—" : String(value).padStart(2, "0")}</strong>
          <p>{detail}</p>
        </article>
      ))}
    </section>
  );
}
