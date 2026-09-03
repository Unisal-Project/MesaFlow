import { CategoryDtoType } from "./dto/category.dto.js";
export type { CategoryDtoType } from "./dto/category.dto.js";
import CategoryRepository from "./repository/category.repository.js";
import { CategoryInput, CategoryOutput } from "./entity/category.entity.js";

export default class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async createCategory(categoryDto: CategoryDtoType): Promise<CategoryOutput> {
    const categoryInput: CategoryInput = {
      name: categoryDto.name,
      description: categoryDto.description,
      active: categoryDto.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.categoryRepository.createCategory(categoryInput);
  }

  async getAllCategories(): Promise<CategoryOutput[]> {
    return this.categoryRepository.getAllCategories();
  }

  async getCategoryById(id: bigint): Promise<CategoryOutput | null> {
    return this.categoryRepository.getCategoryById(id);
  }

  async updateCategory(
    id: bigint,
    categoryDto: CategoryDtoType,
  ): Promise<CategoryOutput> {
    const categoryInput: CategoryInput = {
      name: categoryDto.name,
      description: categoryDto.description,
      active: categoryDto.active,
      updatedAt: new Date(),
    };
    return this.categoryRepository.updateCategory(id, categoryInput);
  }

  async deleteCategory(id: bigint): Promise<void> {
    return this.categoryRepository.deleteCategory(id);
  }
}
