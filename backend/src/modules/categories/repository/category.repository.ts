import type { CategoryEntity } from "../entity/category.entity.js";

export type CreateCategoryData = {
  name: string;
  description?: string | null;
  active: boolean;
};

export type UpdateCategoryData = {
  name: string;
  description?: string | null;
  active: boolean;
};

export interface CategoryRepository {
  create(data: CreateCategoryData): Promise<CategoryEntity>;

  findAll(): Promise<CategoryEntity[]>;

  findById(id: bigint): Promise<CategoryEntity | null>;

  update(id: bigint, data: UpdateCategoryData): Promise<CategoryEntity>;

  delete(id: bigint): Promise<void>;
}
