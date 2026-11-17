import { apiRequest } from "@/api/client";
export type PublicRestaurantSettings = {
  name: string | null;
  address: string | null;
  openingHours: string | null;
  contact: string | null;
};
export type RestaurantSettings = PublicRestaurantSettings & {
  serviceFeeRate: number;
  /** Hora (0–23) em que começa um novo dia de operação (número do pedido). */
  dayCutoffHour: number;
};
export const fetchSettings = () => apiRequest<RestaurantSettings>("/settings");
export const fetchPublicSettings = () =>
  apiRequest<PublicRestaurantSettings>("/settings/public");
export const saveSettings = (data: RestaurantSettings) =>
  apiRequest<RestaurantSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
