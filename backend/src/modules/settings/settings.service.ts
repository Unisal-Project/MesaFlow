import type { SettingsDTO } from "./dto/settings.dto.js";
import type { SettingsRepository } from "./repository/settings.repository.js";
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}
  get() {
    return this.repository.get();
  }
  async getPublic() {
    const { name, address, openingHours, contact } =
      await this.repository.get();
    return { name, address, openingHours, contact };
  }
  save(data: SettingsDTO) {
    return this.repository.save(data);
  }
}
