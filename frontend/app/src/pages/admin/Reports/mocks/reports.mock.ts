import { dateDaysAgo } from "../../Order/utils/order.utils";
import type { ReportDay, ReportScenario } from "../types/report.types";

const revenue = [2500, 3700, 550, 4350, 3500, 6400, 4910];
const orders = [30, 44, 9, 52, 42, 77, 60];
const tables = [16, 24, 5, 29, 23, 42, 32];
const productDailyQuantities = [
  [18, 12, 2, 9, 14, 17, 10],
  [6, 11, 1, 13, 8, 12, 15],
  [10, 7, 2, 6, 8, 10, 8],
  [3, 4, 1, 10, 9, 6, 5],
];
const products = [
  { name: "Burger da casa", quantity: 96 },
  { name: "Pizza margherita", quantity: 72 },
  { name: "Suco natural", quantity: 58 },
  { name: "Risoto de cogumelos", quantity: 42 },
];

// Série demonstrativa independente dos pedidos em atendimento.
export const reportHistory: ReportDay[] = Array.from({ length: 60 }, (_, index) => {
  const daysAgo = 59 - index;
  const day = (6 - daysAgo % 7 + 7) % 7;
  const factor = daysAgo < 7 ? 1 : .85;
  return {
    date: dateDaysAgo(daysAgo),
    revenue: Math.round(revenue[day] * factor),
    orders: Math.round(orders[day] * factor),
    tables: Math.round(tables[day] * factor),
    products: products.map((product, productIndex) => ({
      name: product.name,
      quantity: productDailyQuantities[productIndex][day],
    })),
  };
});

export const reportScenarios: Record<ReportScenario, { changes: number[]; occupancy: number; preparation: number; cancellationsPerWeek: number }> = {
  positive: { changes: [12.4, 8.2, 4.7], occupancy: 74, preparation: 22, cancellationsPerWeek: 5 },
  negative: { changes: [-12.4, -8.2, -4.7], occupancy: 48, preparation: 35, cancellationsPerWeek: 10 },
};
