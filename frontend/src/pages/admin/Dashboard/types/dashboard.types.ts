import type { Order } from "../../Order/types/order.types";
import type { RestaurantTable } from "../../Table/types/table.types";

export type DashboardPeriod =
  | "today"
  | "7days"
  | "30days"
  | "all"
  | "specific";

export type DashboardProps = {
  orders: Order[];
  tables: RestaurantTable[];
  onNavigate?: (id: string) => void;
  onViewOrder?: (orderId: number) => void;
  onViewOrders?: () => void;
  onViewReports?: () => void;
};