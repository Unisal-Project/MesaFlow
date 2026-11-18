import type { FastifyInstance } from "fastify";
import type { UserRepository } from "../users/repository/user.repository.js";
import { UserService } from "../users/user.service.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { BcryptPasswordHasher } from "../../config/hash/bcrypt-password-hasher.js";
import { createAuthRateLimit, type LoginLimiter } from "./auth-rate-limit.js";
import { authenticate } from "../../shared/authenticate.js";
import type { StorageService } from "../../shared/storage/storage.service.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: {
    repository?: UserRepository;
    loginLimiter?: LoginLimiter;
    storage?: StorageService;
  } = {},
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
    options.storage,
  );

  const controller = new AuthController(service, options.loginLimiter);
  const rateLimit = createAuthRateLimit();

  app.post("/auth/register", { onRequest: rateLimit }, (request, reply) =>
    controller.register(request, reply),
  );
  // O login tem limite próprio no controller (por IP e por IP+e-mail, contado na chegada).
  app.post("/auth/login", (request, reply) => controller.login(request, reply));
  // Logout real: sobe a token_version e invalida os tokens do usuário.
  app.post("/auth/logout", { onRequest: authenticate }, (request, reply) =>
    controller.logout(request, reply),
  );
  app.patch(
    "/auth/me",
    { onRequest: [rateLimit, authenticate] },
    (request, reply) => controller.updateProfile(request, reply),
  );
  // Qualquer usuário autenticado troca a PRÓPRIA senha (fora de api-access).
  app.patch(
    "/auth/password",
    { onRequest: [rateLimit, authenticate] },
    (request, reply) => controller.changePassword(request, reply),
  );
  app.post(
    "/auth/me/avatar",
    { onRequest: [rateLimit, authenticate] },
    (request, reply) => controller.uploadAvatar(request, reply),
  );
}
