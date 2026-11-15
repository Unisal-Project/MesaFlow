import { apiRequest } from "@/api/client";
export type PublicRestaurantSettings = {
  name: string | null;
  address: string | null;
  openingHours: string | null;
  contact: string | null;
};
export type RestaurantSettings = PublicRestaurantSettings & {
  serviceFeeRate: number;
};
export const fetchSettings = () => apiRequest<RestaurantSettings>("/settings");
export const fetchPublicSettings = () =>
  apiRequest<PublicRestaurantSettings>("/settings/public");
export const saveSettings = (data: RestaurantSettings) =>
  apiRequest<RestaurantSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
