import type { FastifyInstance } from "fastify";
import type { UserRepository } from "../users/repository/user.repository.js";
import { UserService } from "../users/user.service.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";


export async function registerAuthRoutes(app: FastifyInstance, options: { repository?: UserRepository } = {}, ) {

  const repository = options.repository ??
  
  new ( await import("../users/repository/prisma-user.repository.js") ).PrismaUserRepository();
  
    const service = new AuthService(
    repository,
    new UserService(repository),
    (payload, options) => app.jwt.sign(payload, options),
  );
  
  const controller = new AuthController(service);

  app.post("/auth/register", (request, reply) =>
    controller.register(request, reply),
  );
  app.post("/auth/login", (request, reply) => controller.login(request, reply));
}
