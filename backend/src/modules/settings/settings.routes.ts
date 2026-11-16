import type { UserRepository } from "../users/repository/user.repository.js";
import { PrismaUserRepository } from "../users/repository/prisma-user.repository.js";
import type { FastifyInstance } from "fastify";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";
import { PrismaSettingsRepository } from "./repository/prisma-settings.repository.js";
import type { SettingsRepository } from "./repository/settings.repository.js";
export async function registerSettingsRoutes(
  app: FastifyInstance,
  options: {
    repository?: SettingsRepository;
    userRepository?: Pick<UserRepository, "findById">;
  } = {},
) {
  const controller = new SettingsController(
    new SettingsService(options.repository ?? new PrismaSettingsRepository()),
  );
  app.get("/settings/public", (request, reply) =>
    controller.getPublic(request, reply),
  );
  app.get("/settings", (request, reply) => controller.get(request, reply));
  const users = options.userRepository ?? new PrismaUserRepository();
  app.put(
    "/settings",
    {
      preHandler: async (request, reply) => {
        const user = /^\d+$/.test(request.user.id)
          ? await users.findById(BigInt(request.user.id))
          : null;
        if (
          request.user.role !== "ADMIN" ||
          !user?.active ||
          user.role !== "ADMIN"
        ) {
          return reply.status(403).send({ message: "Acesso negado" });
        }
      },
    },
    (request, reply) => controller.save(request, reply),
  );
}
