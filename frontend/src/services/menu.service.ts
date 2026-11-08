import { apiRequest } from "@/api/client";

export type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  available: boolean;
  active: boolean;
};

export type MenuCatalog = { categories: Category[]; products: Product[] };

export const fetchCategories = (signal?: AbortSignal) => apiRequest<Category[]>("/categories", { signal });
export type CategoryInput = {
  name: string;
  description: string | null;
  active: boolean;
};
export const saveCategory = (data: CategoryInput, id?: string) =>
  apiRequest<Category>(id ? `/categories/${id}` : "/categories", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(data),
  });
export const removeCategory = (id: string) =>
  apiRequest<void>(`/categories/${id}`, { method: "DELETE" });
export const fetchProducts = (signal?: AbortSignal) => apiRequest<Product[]>("/products", { signal });
