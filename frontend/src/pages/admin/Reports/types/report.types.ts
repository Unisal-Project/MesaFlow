import type { SalesReportDay } from "@/services/orders.service";

export type ReportScenario = "positive" | "negative";
export type ReportPeriod = "today" | "7days" | "30days" | "custom";
export type ReportDay = SalesReportDay;
