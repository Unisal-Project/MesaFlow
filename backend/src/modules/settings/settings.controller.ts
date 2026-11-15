import type { FastifyReply, FastifyRequest } from "fastify";
import { settingsSchema } from "./dto/settings.dto.js";
import type { SettingsService } from "./settings.service.js";
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  async get(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.service.get());
  }
  async getPublic(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.service.getPublic());
  }
  async save(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      await this.service.save(settingsSchema.parse(request.body)),
    );
  }
}
