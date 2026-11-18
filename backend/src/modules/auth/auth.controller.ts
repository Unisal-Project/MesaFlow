import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service.js";
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
    // Conta ANTES do bcrypt: uma rajada paralela não testa senhas além do limite.
    const retryMs = await this.loginLimiter.attempt(request.ip, email);
    if (retryMs > 0) {
      return reply
        .header("Retry-After", String(Math.ceil(retryMs / 1000)))
        .status(429)
        .send({ message: "Muitas tentativas. Tente novamente mais tarde." });
    }
    const result = await this.authService.login(email, password);
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
