import type { SettingsDTO } from "./dto/settings.dto.js";
import type { SettingsRepository } from "./repository/settings.repository.js";
import { LocalStorageService } from "../../shared/storage/local-storage.service.js";
import type {
  StorageService,
  UploadFile,
} from "../../shared/storage/storage.service.js";
export class SettingsService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly storage: StorageService = new LocalStorageService(),
  ) {}
  get() {
    return this.repository.get();
  }
  async getPublic() {
    const { name, address, openingHours, contact, bannerImageUrl } =
      await this.repository.get();
    return { name, address, openingHours, contact, bannerImageUrl };
  }
  save(data: SettingsDTO) {
    return this.repository.save(data);
  }

  async uploadBanner(file: UploadFile) {
    const previous = await this.repository.get();
    const url = await this.storage.uploadProductImage(file);
    let updated;
    try {
      updated = await this.repository.saveBannerImage(url);
    } catch (error) {
      await this.storage.delete(url).catch(() => undefined);
      throw error;
    }
    if (previous.bannerImageUrl) {
      await this.storage.delete(previous.bannerImageUrl).catch(() => undefined);
    }
    return updated;
  }
}
