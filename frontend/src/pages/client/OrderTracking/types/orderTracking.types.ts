export type OrderTrackingStatus =
  | "waiting"
  | "preparing"
  | "ready"
  | "delivered";

export type OrderTrackingData = {
  id: number;
  status: OrderTrackingStatus;
  cartItemCount: number;
};

export type OrderTrackingProps = {
  order?: OrderTrackingData;
  onBack?: () => void;
  onNavigate?: (destination: string) => void;
};