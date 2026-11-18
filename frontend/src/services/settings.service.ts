import { apiRequest } from "@/api/client";
export type PublicRestaurantSettings = {
  name: string | null;
  address: string | null;
  openingHours: string | null;
  contact: string | null;
  bannerImageUrl?: string | null;
};
export type RestaurantSettings = PublicRestaurantSettings & {
  serviceFeeRate: number;
};
export const fetchSettings = () => apiRequest<RestaurantSettings>("/settings");
export const fetchPublicSettings = () =>
  apiRequest<PublicRestaurantSettings>("/settings/public");
export const saveSettings = (data: Omit<RestaurantSettings, "bannerImageUrl">) =>
  apiRequest<RestaurantSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const uploadRestaurantBanner = (file: File) => {
  const body = new FormData();
  body.append("image", file);
  return apiRequest<RestaurantSettings>("/settings/banner", { method: "POST", body });
};
