import {
  ProductInput,
  ProductOutput,
  ProductUpdateInput,
} from "../entity/products.entity.js";

export default abstract class ProductsRepository {
  abstract createProduct(productInput: ProductInput): Promise<ProductOutput>;

  abstract getProductById(id: bigint): Promise<ProductOutput | null>;

  abstract getAllProducts(): Promise<ProductOutput[]>;

  abstract updateProduct(
    id: bigint,
    productUpdateInput: ProductUpdateInput,
  ): Promise<ProductOutput>;

  abstract deactivateProduct(id: bigint): Promise<void>;

  abstract switchCategory(
    id: bigint,
    newCategoryId: bigint,
  ): Promise<ProductOutput>;
}
