import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserSchema } from "./dto/create-user.dto.js";
import { updateUserSchema } from "./dto/update-user.dto.js";
import { userIdSchema } from "./dto/user-id.dto.js";
import type { PublicUser, UserService } from "./user.service.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.userService.createUser(
      createUserSchema.parse(request.body),
    );
    return reply.status(201).send(this.toResponse(user));
  }

  async getAll(_request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.getAllUsers();
    return reply.status(200).send(users.map((user) => this.toResponse(user)));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = userIdSchema.parse(request.params);
    return reply
      .status(200)
      .send(this.toResponse(await this.userService.getUserById(id)));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = userIdSchema.parse(request.params);
    const data = updateUserSchema.parse(request.body);
    return reply
      .status(200)
      .send(this.toResponse(await this.userService.updateUser(id, data)));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = userIdSchema.parse(request.params);
    await this.userService.deleteUser(id);
    return reply.status(204).send();
  }

  private toResponse(user: PublicUser) {
    return { ...user, id: user.id.toString() };
  }
}
