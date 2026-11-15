import type { FastifyInstance } from "fastify";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";
import { PrismaSettingsRepository } from "./repository/prisma-settings.repository.js";
import type { SettingsRepository } from "./repository/settings.repository.js";
export async function registerSettingsRoutes(
  app: FastifyInstance,
  options: { repository?: SettingsRepository } = {},
) {
  const controller = new SettingsController(
    new SettingsService(options.repository ?? new PrismaSettingsRepository()),
  );
  app.get("/settings/public", (request, reply) =>
    controller.getPublic(request, reply),
  );
  app.get("/settings", (request, reply) => controller.get(request, reply));
  app.put("/settings", (request, reply) => controller.save(request, reply));
}
