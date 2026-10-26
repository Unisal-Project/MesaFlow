export type DashboardPeriod =
  | "today"
  | "7days"
  | "30days"
  | "all"
  | "specific";

export type DashboardProps = {
  onNavigate?: (id: string) => void;
  onViewOrder?: (orderId: number) => void;
  onViewOrders?: () => void;
  onViewReports?: () => void;
};