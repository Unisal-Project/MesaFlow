import { topProducts } from "../mocks/dashboard.mock";

export function TopProducts() {
  return (
    <section
      className="mf-dashboard-panel mf-dashboard-analytics-card"
      aria-labelledby="dashboard-analytics-products-title"
    >
      <div className="mf-dashboard-panel-heading">
        <h2 id="dashboard-analytics-products-title">
          Produtos mais vendidos
        </h2>
      </div>

      <ol className="mf-dashboard-analytics-ranking">
        {topProducts.map(({ name, quantity }, index) => (
          <li
            className="mf-dashboard-analytics-row"
            key={name}
          >
            <span
              className="mf-dashboard-analytics-rank"
              aria-hidden="true"
            >
              {index + 1}
            </span>

            <span className="mf-dashboard-analytics-product">
              {name}
            </span>

            <strong>{quantity} un.</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}