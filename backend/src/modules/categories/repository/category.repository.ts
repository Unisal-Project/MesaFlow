import { CategoryInput, CategoryOutput } from "../entity/category.entity.js";

export default abstract class CategoryRepository {
  abstract createCategory(category: CategoryInput): Promise<CategoryOutput>;

  abstract getAllCategories(): Promise<CategoryOutput[]>;

  abstract getCategoryById(id: bigint): Promise<CategoryOutput | null>;

  abstract updateCategory(
    id: bigint,
    category: CategoryInput,
  ): Promise<CategoryOutput>;

  abstract deleteCategory(id: bigint): Promise<void>;
}
