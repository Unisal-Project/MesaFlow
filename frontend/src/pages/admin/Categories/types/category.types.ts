export type Category = {
  id: number;
  name: string;
  description: string;
  productCount: number;
  active: boolean;
};

export type CategoryForm = Pick<
  Category,
  "name" | "description" | "active"
>;

export type CategoriesProps = {
  onNavigate?: (id: string) => void;
};