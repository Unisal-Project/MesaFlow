import type { SettingsDTO } from "../dto/settings.dto.js";
export interface SettingsRepository {
  get(): Promise<SettingsDTO>;
  save(data: SettingsDTO): Promise<SettingsDTO>;
}
