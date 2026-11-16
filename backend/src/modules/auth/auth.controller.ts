import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service.js";
import { AppError } from "../../shared/errors/app-errors.js";
import { createLoginLimiter, type LoginLimiter } from "./auth-rate-limit.js";
import {
  updateProfileSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "./dto/auth.dto.js";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginLimiter: LoginLimiter = createLoginLimiter(),
  ) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.authService.register(
      registerSchema.parse(request.body),
    );
    return reply.status(201).send({
      ...result,
      user: { ...result.user, id: result.user.id.toString() },
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = loginSchema.parse(request.body);
    const retryMs = await this.loginLimiter.retryAfterMs(request.ip, email);
    if (retryMs > 0) {
      return reply
        .header("Retry-After", String(Math.ceil(retryMs / 1000)))
        .status(429)
        .send({ message: "Muitas tentativas. Tente novamente mais tarde." });
    }
    let result;
    try {
      result = await this.authService.login(email, password);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401)
        await this.loginLimiter.fail(request.ip, email);
      throw error;
    }
    await this.loginLimiter.succeed(request.ip, email);
    return reply.status(200).send({
      ...result,
      user: { ...result.user, id: result.user.id.toString() },
    });
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.authService.updateProfile(
      BigInt(request.user.id),
      updateProfileSchema.parse(request.body),
    );
    return reply.send({ ...user, id: user.id.toString() });
  }

  /** Devolve um token novo: os anteriores (outras sessões) deixam de valer. */
  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      request.body,
    );
    const result = await this.authService.changePassword(
      BigInt(request.user.id),
      currentPassword,
      newPassword,
    );
    return reply.status(200).send({
      ...result,
      user: { ...result.user, id: result.user.id.toString() },
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    await this.authService.logout(BigInt(request.user.id));
    return reply.status(204).send();
  }
}
