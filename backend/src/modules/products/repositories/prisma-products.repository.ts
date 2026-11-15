import { PrismaConnector } from "../../../database/prisma.js";
import { Prisma, type Product } from "../../../generated/prisma/client.js";
import type ProductsRepository from "./products.repository.js";
import {
  ProductInput,
  ProductOutput,
  ProductUpdateInput,
} from "../entity/products.entity.js";
import type { PromotionsBatchDTO } from "../dto/products.dto.js";
import { AppError } from "../../../shared/errors/app-errors.js";
import {
  effectivePrice,
  pricing,
  promoFields,
  promoIssue,
  promoSelect,
  type Promo,
} from "../promotion.js";

// A promoção da categoria principal entra no preço final (regra 8).
const include = {
  additionalCategories: true,
  category: { select: promoFields },
} as const;

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
            include,
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
      include,
    });
    return product ? this.toProduct(product) : null;
  }

  async getAllProducts(): Promise<ProductOutput[]> {
    const products = await this.prismaClient.product.findMany({
      where: { active: true },
      include,
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

    if (productUpdateInput.imageUrls !== undefined) {
      const [first, second, third] = productUpdateInput.imageUrls;
      data.imageUrl = first ?? null;
      data.imageUrl2 = second ?? null;
      data.imageUrl3 = third ?? null;
    }

    if (productUpdateInput.price !== undefined) {
      data.price = productUpdateInput.price;
    }

    if (productUpdateInput.stockQuantity !== undefined) {
      data.stockQuantity = productUpdateInput.stockQuantity;
    }

    if (productUpdateInput.trackStock !== undefined) {
      data.trackStock = productUpdateInput.trackStock;
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

    for (const key of [
      "promoType",
      "promoValue",
      "promoActive",
      "promoStartsAt",
      "promoEndsAt",
    ] as const) {
      if (productUpdateInput[key] !== undefined) {
        Object.assign(data, { [key]: productUpdateInput[key] });
      }
    }

    try {
      return await this.prismaClient.$transaction(async (tx) => {
        // Serializa mudanças de categorias do mesmo produto.
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
        const current = await tx.product.findUnique({
          where: { id },
          include,
        });
        if (!current) throw new AppError("Produto não encontrado", 404);
        // PATCH parcial: valida a promoção com o estado resultante.
        const promoMessage = promoIssue(
          { ...current, ...productUpdateInput },
          productUpdateInput.price ?? Number(current.price),
        );
        if (promoMessage) throw new AppError(promoMessage, 400);
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
            include,
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
      select: { id: true, ...promoSelect },
    });

    return products.map((product) => ({
      id: product.id,
      price: effectivePrice(product),
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
    product: Product & {
      additionalCategories?: { categoryId: bigint }[];
      category?: Promo | null;
    },
  ): ProductOutput {
    // Sem spread de category: só o preço final e a promoção aplicada saem.
    const { additionalCategories, category, imageUrl2, imageUrl3, ...data } =
      product;
    return {
      ...data,
      imageUrls: [product.imageUrl, imageUrl2, imageUrl3].filter(
        (url): url is string => Boolean(url),
      ),
      price: product.price.toString(),
      promoValue: product.promoValue?.toString() ?? null,
      ...pricing({ ...product, category }),
      additionalCategoryIds: (additionalCategories ?? []).map(
        (item) => item.categoryId,
      ),
    };
  }

  /** Tudo ou nada: valida R$ contra cada preço e grava produtos e categorias. */
  async applyPromotions(batch: PromotionsBatchDTO) {
    const { productIds, categoryIds, ...data } = batch;
    return this.prismaClient.$transaction(async (tx) => {
      if (data.promoType === "AMOUNT" && data.promoValue != null) {
        const value = data.promoValue;
        const tooCheap = (
          await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { name: true, price: true },
          })
        ).filter((product) => Number(product.price) <= value);
        if (tooCheap.length) {
          throw new AppError(
            `O desconto em R$ deve ser menor que o preço de: ${tooCheap
              .map((product) => product.name)
              .join(", ")}`,
            400,
          );
        }
      }
      const products = productIds.length
        ? (
            await tx.product.updateMany({
              where: { id: { in: productIds } },
              data,
            })
          ).count
        : 0;
      const categories = categoryIds.length
        ? (
            await tx.category.updateMany({
              where: { id: { in: categoryIds } },
              data,
            })
          ).count
        : 0;
      if (products !== productIds.length)
        throw new AppError("Produto não encontrado", 404);
      if (categories !== categoryIds.length)
        throw new AppError("Categoria não encontrada", 404);
      return { products, categories };
    });
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
