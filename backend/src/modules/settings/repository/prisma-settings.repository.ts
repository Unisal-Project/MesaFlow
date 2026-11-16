import { PrismaConnector } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import type { SettingsDTO } from "../dto/settings.dto.js";
import type { SettingsRepository } from "./settings.repository.js";

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}
  async get(): Promise<SettingsDTO> {
    const row = await this.prismaClient.restaurantSettings.findUnique({
      where: { id: 1 },
    });
    if (!row)
      throw new AppError("Configurações do restaurante indisponíveis.", 503);
    return this.toResponse(row);
  }
  async save(data: SettingsDTO): Promise<SettingsDTO> {
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
    row: Omit<SettingsDTO, "serviceFeeRate"> & {
      serviceFeeRate: { toString(): string } | number;
    },
  ): SettingsDTO {
    return {
      name: row.name,
      address: row.address,
      openingHours: row.openingHours,
      contact: row.contact,
      serviceFeeRate: Number(row.serviceFeeRate),
    };
  }
}
