import { CategoryInput, CategoryOutput } from "../entity/category.entity.js";
import { prisma } from "../../../database/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import CategoryRepository from "./category.repository.js";

export default class PrismaCategoryRepository extends CategoryRepository {
  constructor(private readonly prismaClient: typeof prisma = prisma) {
    super();
  }

  async createCategory(category: CategoryInput): Promise<CategoryOutput> {
    try {
      return await this.prismaClient.category.create({
        data: {
          ...category,
          createdAt: category.createdAt ?? undefined,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deleteCategory(id: bigint): Promise<void> {
    try {
      await this.prismaClient.category.delete({
        where: { id },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getAllCategories(): Promise<CategoryOutput[]> {
    return this.prismaClient.category.findMany();
  }

  async getCategoryById(id: bigint): Promise<CategoryOutput | null> {
    return this.prismaClient.category.findUnique({
      where: { id },
    });
  }

  async updateCategory(
    id: bigint,
    category: CategoryInput,
  ): Promise<CategoryOutput> {
    try {
      return await this.prismaClient.category.update({
        where: { id },
        data: {
          ...category,
          createdAt: category.createdAt ?? undefined,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new AppError("Category name already exists", 409);
      }

      if (error.code === "P2025") {
        throw new AppError("Category not found", 404);
      }

      if (error.code === "P2003") {
        throw new AppError("Category cannot be deleted because it has products", 409);
      }
    }

    throw error;
  }
}
