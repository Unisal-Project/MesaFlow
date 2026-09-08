import { prisma } from "../../../database/prisma.js";
import ProductsRepository from "./products.repository.js";
import {
  ProductInput,
  ProductOutput,
  ProductUpdateInput,
} from "../entity/products.entity.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../../shared/errors/app-errors.js";

export default class PrismaProductsRepository extends ProductsRepository {
  constructor(private readonly prismaClient: typeof prisma = prisma) {
    super();
  }

  async createProduct(productInput: ProductInput): Promise<ProductOutput> {
    try {
      return await this.prismaClient.product.create({
        data: {
          name: productInput.name,
          description: productInput.description,
          imageUrl: productInput.imageUrl,
          price: productInput.price,
          categoryId: productInput.categoryId,
          stockQuantity: productInput.stockQuantity,
          available: productInput.available,
          active: productInput.active,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getProductById(id: bigint): Promise<ProductOutput | null> {
    const product = await this.prismaClient.product.findUnique({
      where: { id },
    });
    return product;
  }

  async getAllProducts(): Promise<ProductOutput[]> {
    const products = await this.prismaClient.product.findMany();
    return products;
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
      return await this.prismaClient.product.update({
        where: { id },
        data,
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
    try {
      return await this.prismaClient.product.update({
        where: { id },
        data: { categoryId: newCategoryId },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
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
