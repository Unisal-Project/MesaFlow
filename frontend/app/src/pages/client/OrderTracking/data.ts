export type OrderTrackingStatus = "waiting" | "preparing" | "ready" | "delivered";

export type OrderTrackingData = {
  id: number;
  status: OrderTrackingStatus;
  cartItemCount: number;
};

// Dados de demonstração. Futuramente, passe os dados da API pela prop `order`.
export const mockOrderTracking: OrderTrackingData = {
  id: 1842,
  status: "preparing",
  cartItemCount: 0,
};
