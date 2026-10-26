import { PrismaConnector } from "../../../database/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import type { CreateUserData, UpdateUserData , UserEntity } from "../entity/user.entity.js";
import type { UserRepository } from "./user.repository.js";

export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: typeof PrismaConnector = PrismaConnector,
  ) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findById(id: bigint): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.prisma.user.findMany();
  }

  async update(id: bigint, data: UpdateUserData): Promise<UserEntity> {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async delete(id: bigint): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        throw new AppError("E-mail já cadastrado", 409);
      if (error.code === "P2025")
        throw new AppError("Usuário não encontrado", 404);
    }
    throw error;
  }
}
