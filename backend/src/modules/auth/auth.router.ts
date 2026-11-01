import type { FastifyInstance } from "fastify";
import type { UserRepository } from "../users/repository/user.repository.js";
import { UserService } from "../users/user.service.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { BcryptPasswordHasher } from "../../config/hash/bcrypt-password-hasher.js";
import { createAuthRateLimit } from "./auth-rate-limit.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: { repository?: UserRepository } = {},
) {
  const repository =
    options.repository ??
    new (
      await import("../users/repository/prisma-user.repository.js")
    ).PrismaUserRepository();

  const passwordHasher = new BcryptPasswordHasher();
  const service = new AuthService(
    passwordHasher,
    repository,
    new UserService(repository, passwordHasher),
    (payload, options) => app.jwt.sign(payload, options),
  );

  const controller = new AuthController(service);
  const rateLimit = createAuthRateLimit();

  app.post("/auth/register", { onRequest: rateLimit }, (request, reply) =>
    controller.register(request, reply),
  );
  app.post("/auth/login", { onRequest: rateLimit }, (request, reply) =>
    controller.login(request, reply),
  );
}
