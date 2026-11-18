import type { SettingsDTO, SettingsResponse } from "../dto/settings.dto.js";
export interface SettingsRepository {
  get(): Promise<SettingsResponse>;
  save(data: SettingsDTO): Promise<SettingsResponse>;
}
