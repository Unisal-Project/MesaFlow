import type { CategoryEntity } from "../entity/category.entity.js";

export type CreateCategoryData = {
  name: string;
  description?: string | null;
  active: boolean;
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

export type UpdateCategoryData = {
  name: string;
  description?: string | null;
  active: boolean;
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

export interface CategoryRepository {
  create(data: CreateCategoryData): Promise<CategoryEntity>;

  findAll(): Promise<CategoryEntity[]>;

  findById(id: bigint): Promise<CategoryEntity | null>;

  update(id: bigint, data: UpdateCategoryData): Promise<CategoryEntity>;

  /** Com moveTo, move todos os produtos (ativos e inativos) antes de excluir. */
  delete(id: bigint, moveTo?: bigint, deleteProducts?: boolean): Promise<void>;
}
