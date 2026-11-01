import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema } from "./dto/auth.dto.js";

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
}
