import { dateDaysAgo } from "../utils/dashboard.utils";

export const weeklySales = [4200, 5800, 4900, 7200, 6100, 8400, 7500];

export const chartSalesHistory = Array.from({ length: 30 }, (_, index) => {
  const daysAgo = 29 - index;
  return weeklySales[6 - (daysAgo % 7)];
});

export const chartPeriods = [7, 14, 30];

export const topProducts = [
  { name: "Risoto de cogumelos", quantity: 42 },
  { name: "Nhoque artesanal", quantity: 36 },
  { name: "Limonada com hortelã", quantity: 31 },
  { name: "Pudim de doce de leite", quantity: 24 },
];

export const operationalSummary = [
  { label: "Tempo médio de preparo", value: "18 min" },
  { label: "Mesas atendidas", value: "52" },
  { label: "Pedidos cancelados", value: "2" },
  { label: "Pagamentos concluídos", value: "47" },
];

export const salesHistory = [
  { date: dateDaysAgo(0), sales: 8420, ticket: 96.4, orders: 87 },
  { date: dateDaysAgo(1), sales: 7518, ticket: 92.7, orders: 81 },
  { date: dateDaysAgo(4), sales: 6240, ticket: 89.14, orders: 70 },
  { date: dateDaysAgo(12), sales: 9150, ticket: 101.67, orders: 90 },
  { date: dateDaysAgo(35), sales: 5680, ticket: 88.75, orders: 64 },
];

export const orders = [
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

export const tables = [
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

export const tableLabels: Record<string, string> = {
  available: "Disponível",
  occupied: "Ocupada",
  payment: "Aguardando pagamento",
};