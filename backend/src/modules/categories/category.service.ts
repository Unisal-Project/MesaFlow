import type { CreateCategoryDTO } from "./dto/create-category.dto.js";
import type { UpdateCategoryDTO } from "./dto/update-category.dto.js";

import type { CategoryEntity } from "./entity/category.entity.js";
import type { CategoryRepository } from "./repository/category.repository.js";

export default class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async createCategory(
    categoryDto: CreateCategoryDTO,
  ): Promise<CategoryEntity> {
    return this.categoryRepository.create(categoryDto);
  }

  async getAllCategories(): Promise<CategoryEntity[]> {
    return this.categoryRepository.findAll();
  }

  async getCategoryById(id: bigint): Promise<CategoryEntity | null> {
    return this.categoryRepository.findById(id);
  }

  async updateCategory(
    id: bigint,
    categoryDto: UpdateCategoryDTO,
  ): Promise<CategoryEntity> {
    return this.categoryRepository.update(id, categoryDto);
  }

  async deleteCategory(id: bigint): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}
