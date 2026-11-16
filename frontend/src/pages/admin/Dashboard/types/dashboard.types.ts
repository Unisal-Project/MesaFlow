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
  /** Pedidos ou mesas ainda carregando: indicadores mostram "—". */
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onNavigate?: (id: string) => void;
  onViewOrder?: (orderId: number) => void;
  onViewOrders?: () => void;
  onViewReports?: () => void;
  /** Abre a mesa clicada no mapa (tela Mesas com os detalhes dela). */
  onOpenTable?: (table: RestaurantTable) => void;
};