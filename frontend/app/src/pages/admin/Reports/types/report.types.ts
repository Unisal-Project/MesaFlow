export type ReportScenario = "positive" | "negative";
export type ReportPeriod = "today" | "7days" | "30days" | "custom";
export type ReportDay = {
  date: string;
  revenue: number;
  orders: number;
  tables: number;
  products: { name: string; quantity: number }[];
};
