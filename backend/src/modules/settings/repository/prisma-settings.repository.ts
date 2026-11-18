import { PrismaConnector } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import type { SettingsDTO } from "../dto/settings.dto.js";
import type {
  RestaurantSettings,
  SettingsRepository,
} from "./settings.repository.js";

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}
  async get(): Promise<RestaurantSettings> {
    const row = await this.prismaClient.restaurantSettings.findUnique({
      where: { id: 1 },
    });
    if (!row)
      throw new AppError("Configurações do restaurante indisponíveis.", 503);
    return this.toResponse(row);
  }
  async save(data: SettingsDTO): Promise<RestaurantSettings> {
    const values = {
      serviceFeeRate: data.serviceFeeRate,
      name: data.name,
      address: data.address,
      openingHours: data.openingHours,
      contact: data.contact,
    };
    return this.toResponse(
      await this.prismaClient.restaurantSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ...values },
        update: values,
      }),
    );
  }
  private toResponse(
    row: Omit<RestaurantSettings, "serviceFeeRate"> & {
      serviceFeeRate: { toString(): string } | number;
    },
  ): RestaurantSettings {
    return {
      name: row.name,
      bannerImageUrl: row.bannerImageUrl ?? null,
      address: row.address,
      openingHours: row.openingHours,
      contact: row.contact,
      serviceFeeRate: Number(row.serviceFeeRate),
    };
  }

  async saveBannerImage(url: string): Promise<RestaurantSettings> {
    return this.toResponse(
      await this.prismaClient.restaurantSettings.update({
        where: { id: 1 },
        data: { bannerImageUrl: url },
      }),
    );
  }
}
