import {
  ProductInput,
  ProductOutput,
  ProductUpdateInput,
} from "../entity/products.entity.js";
import type { PromotionsBatchDTO } from "../dto/products.dto.js";

export default interface ProductsRepository {
  createProduct(productInput: ProductInput): Promise<ProductOutput>;

  getProductById(id: bigint): Promise<ProductOutput | null>;

  getAllProducts(): Promise<ProductOutput[]>;

  updateProduct(
    id: bigint,
    productUpdateInput: ProductUpdateInput,
  ): Promise<ProductOutput>;

  deactivateProduct(id: bigint): Promise<void>;

  switchCategory(id: bigint, newCategoryId: bigint): Promise<ProductOutput>;

  applyPromotions(
    batch: PromotionsBatchDTO,
  ): Promise<{ products: number; categories: number }>;
}
