import type { PromoFields, PromoForm } from "@/utils/promotion";

export type Category = {
  id: string;
  name: string;
  description: string;
  productCount: number;
  active: boolean;
} & PromoFields;

/** Produto da categoria excluída e a categoria para onde ele vai. */
export type CategoryProductMove = {
  product: { id: string; additionalCategoryIds: string[] };
  categoryId: string;
};

export type CategoryForm = Pick<
  Category,
  "name" | "description" | "active"
> & { promo: PromoForm };

export type CategoriesProps = {
  onNavigate?: (id: string) => void;
};