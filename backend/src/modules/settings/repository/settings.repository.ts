import type { SettingsDTO } from "../dto/settings.dto.js";
export type RestaurantSettings = SettingsDTO & {
  bannerImageUrl?: string | null;
};
export interface SettingsRepository {
  get(): Promise<RestaurantSettings>;
  save(data: SettingsDTO): Promise<RestaurantSettings>;
  saveBannerImage(url: string): Promise<RestaurantSettings>;
}
