import type { SettingsDTO, SettingsResponse } from "../dto/settings.dto.js";
export type RestaurantSettings = SettingsResponse & {
  bannerImageUrl?: string | null;
};
export interface SettingsRepository {
  get(): Promise<RestaurantSettings>;
  save(data: SettingsDTO): Promise<RestaurantSettings>;
  saveBannerImage(url: string): Promise<RestaurantSettings>;
}
