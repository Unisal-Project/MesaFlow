import { PrismaConnector } from "../../../database/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import { promoIssue, type Promo } from "../../products/promotion.js";

import { CategoryEntity } from "../entity/category.entity.js";

import type {
  CategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from "./category.repository.js";

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  private toEntity(
    category: {
      id: bigint;
      name: string;
      description: string | null;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    } & Promo,
  ): CategoryEntity {
    return new CategoryEntity(
      category.id,
      category.name,
      category.description,
      category.active,
      category.createdAt,
      category.updatedAt,
      {
        promoType: category.promoType,
        promoValue: category.promoValue?.toString() ?? null,
        promoActive: category.promoActive,
        promoStartsAt: category.promoStartsAt,
        promoEndsAt: category.promoEndsAt,
      },
    );
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    try {
      const category = await this.prismaClient.category.create({
        data,
      });

      return this.toEntity(category);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<CategoryEntity[]> {
    const categories = await this.prismaClient.category.findMany();

    return categories.map((category) => this.toEntity(category));
  }

  async findById(id: bigint): Promise<CategoryEntity | null> {
    const category = await this.prismaClient.category.findUnique({
      where: { id },
    });

    return category ? this.toEntity(category) : null;
  }

  async update(id: bigint, data: UpdateCategoryData): Promise<CategoryEntity> {
    try {
      const category = await this.prismaClient.$transaction(async (tx) => {
        // PUT parcial na promoção: valida com o estado resultante.
        const current = await tx.category.findUnique({ where: { id } });
        if (!current) throw new AppError("Categoria não encontrada", 404);
        const message = promoIssue({ ...current, ...data });
        if (message) throw new AppError(message, 400);
        return tx.category.update({ where: { id }, data });
      });

      return this.toEntity(category);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async delete(id: bigint, moveTo?: bigint): Promise<void> {
    try {
      if (moveTo === undefined) {
        await this.prismaClient.category.delete({ where: { id } });
        return;
      }
      if (moveTo === id) {
        throw new AppError(
          "A categoria de destino deve ser diferente da excluída",
          400,
        );
      }
      // Tudo ou nada: mover produtos, limpar ligações adicionais e excluir.
      await this.prismaClient.$transaction(async (tx) => {
        const target = await tx.category.findUnique({ where: { id: moveTo } });
        if (!target) {
          throw new AppError("Categoria de destino não encontrada", 404);
        }
        // Quem passa a ter moveTo como principal não pode tê-la como adicional.
        await tx.productCategory.deleteMany({
          where: { categoryId: moveTo, product: { categoryId: id } },
        });
        await tx.productCategory.deleteMany({ where: { categoryId: id } });
        await tx.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: moveTo },
        });
        await tx.category.delete({ where: { id } });
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new AppError("Já existe uma categoria com esse nome", 409);
      }

      if (error.code === "P2025") {
        throw new AppError("Categoria não encontrada", 404);
      }

      if (error.code === "P2003") {
        throw new AppError(
          "Não é possível excluir uma categoria que possui produtos",
          409,
        );
      }
    }

    throw error;
  }
}
