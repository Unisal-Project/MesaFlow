import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service.js";
import {
  updateProfileSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "./dto/auth.dto.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const result = await this.authService.login(email, password);
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

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      request.body,
    );
    await this.authService.changePassword(
      BigInt(request.user.id),
      currentPassword,
      newPassword,
    );
    return reply.status(204).send();
  }
}
