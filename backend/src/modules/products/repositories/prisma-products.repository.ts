import { PrismaConnector } from "../../../database/prisma.js";
import { Prisma, type Product } from "../../../generated/prisma/client.js";
import type ProductsRepository from "./products.repository.js";
import {
  ProductInput,
  ProductOutput,
  ProductUpdateInput,
} from "../entity/products.entity.js";
import { AppError } from "../../../shared/errors/app-errors.js";

export class PrismaProductRepository implements ProductsRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async createProduct(productInput: ProductInput): Promise<ProductOutput> {
    try {
      return await this.prismaClient.$transaction(async (tx) => {
        await this.validateCategories(
          tx,
          productInput.categoryId,
          productInput.additionalCategoryIds ?? [],
        );
        const { additionalCategoryIds, ...data } = productInput;
        return this.toProduct(
          await tx.product.create({
            data: {
              ...data,
              additionalCategories: {
                create: (additionalCategoryIds ?? []).map((categoryId) => ({
                  categoryId,
                })),
              },
            },
            include: { additionalCategories: true },
          }),
        );
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getProductById(id: bigint): Promise<ProductOutput | null> {
    const product = await this.prismaClient.product.findUnique({
      where: { id },
      include: { additionalCategories: true },
    });
    return product ? this.toProduct(product) : null;
  }

  async getAllProducts(): Promise<ProductOutput[]> {
    const products = await this.prismaClient.product.findMany({
      include: { additionalCategories: true },
    });
    return products.map((product) => this.toProduct(product));
  }

  async updateProduct(
    id: bigint,
    productUpdateInput: ProductUpdateInput,
  ): Promise<ProductOutput> {
    const data: Prisma.ProductUncheckedUpdateInput = {};

    if (productUpdateInput.name !== undefined) {
      data.name = productUpdateInput.name;
    }

    if (productUpdateInput.description !== undefined) {
      data.description = productUpdateInput.description;
    }

    if (productUpdateInput.imageUrl !== undefined) {
      data.imageUrl = productUpdateInput.imageUrl;
    }

    if (productUpdateInput.price !== undefined) {
      data.price = productUpdateInput.price;
    }

    if (productUpdateInput.stockQuantity !== undefined) {
      data.stockQuantity = productUpdateInput.stockQuantity;
    }

    if (productUpdateInput.available !== undefined) {
      data.available = productUpdateInput.available;
    }

    if (productUpdateInput.active !== undefined) {
      data.active = productUpdateInput.active;
    }

    if (productUpdateInput.categoryId !== undefined) {
      data.categoryId = productUpdateInput.categoryId;
    }

    try {
      return await this.prismaClient.$transaction(async (tx) => {
        // Serializa mudanças de categorias do mesmo produto.
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
        const current = await tx.product.findUnique({
          where: { id },
          include: { additionalCategories: true },
        });
        if (!current) throw new AppError("Produto não encontrado", 404);
        const categoryId = productUpdateInput.categoryId ?? current.categoryId;
        const additionalIds =
          productUpdateInput.additionalCategoryIds ??
          current.additionalCategories.map((item) => item.categoryId);
        await this.validateCategories(tx, categoryId, additionalIds);
        if (productUpdateInput.additionalCategoryIds !== undefined) {
          data.additionalCategories = {
            deleteMany: {},
            create: additionalIds.map((categoryId) => ({ categoryId })),
          };
        }
        return this.toProduct(
          await tx.product.update({
            where: { id },
            data,
            include: { additionalCategories: true },
          }),
        );
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deactivateProduct(id: bigint): Promise<void> {
    try {
      await this.prismaClient.product.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async switchCategory(
    id: bigint,
    newCategoryId: bigint,
  ): Promise<ProductOutput> {
    return this.updateProduct(id, { categoryId: newCategoryId });
  }

  async findAvailableByIds(
    ids: bigint[],
  ): Promise<{ id: bigint; price: string }[]> {
    const products = await this.prismaClient.product.findMany({
      where: {
        id: { in: ids },
        active: true,
        available: true,
      },
    });

    return products.map((product) => ({
      id: product.id,
      price: product.price.toString(),
    }));
  }

  private async validateCategories(
    tx: Prisma.TransactionClient,
    categoryId: bigint,
    additionalIds: bigint[],
  ) {
    if (
      new Set(additionalIds).size !== additionalIds.length ||
      additionalIds.includes(categoryId)
    ) {
      throw new AppError(
        "Categorias adicionais duplicadas ou iguais à principal",
        400,
      );
    }
    const ids = [categoryId, ...additionalIds];
    const count = await tx.category.count({ where: { id: { in: ids } } });
    if (count !== ids.length)
      throw new AppError("Categoria não encontrada", 404);
  }

  private toProduct(
    product: Product & { additionalCategories?: { categoryId: bigint }[] },
  ): ProductOutput {
    const { additionalCategories, ...data } = product;
    return {
      ...data,
      price: product.price.toString(),
      additionalCategoryIds: (additionalCategories ?? []).map(
        (item) => item.categoryId,
      ),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new AppError("Produto não encontrado", 404);
      }

      if (error.code === "P2003") {
        throw new AppError("Categoria não encontrada", 404);
      }
    }

    throw error;
  }
}
