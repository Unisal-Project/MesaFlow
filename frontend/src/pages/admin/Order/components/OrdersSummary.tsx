import type { Order } from "../types/order.types";

type OrdersSummaryProps = {
  orders: Order[];
  todayTotal: number;
};

export function OrdersSummary({ orders, todayTotal }: OrdersSummaryProps) {
  const indicators = [
    { label: "Pedidos registrados", value: orders.length, detail: "Total", status: "total" },
    {
      label: "Total do dia",
      value: todayTotal,
      detail: "Hoje",
      status: "total",
    },
  ];

  return (
    <section className="orders-indicators" aria-label="Indicadores dos pedidos">
      {indicators.map(({ label, value, detail, status }) => (
        <article className="orders-indicator" data-status={status} key={label}>
          <span>{label}</span>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span className="order-status-badge" data-status={status}>
            {detail}
          </span>
        </article>
      ))}
    </section>
  );
}
