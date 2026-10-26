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
export const fetchProducts = (signal?: AbortSignal) => apiRequest<Product[]>("/products", { signal });
