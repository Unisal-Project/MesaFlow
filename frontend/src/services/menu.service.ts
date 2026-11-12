import { authHeaders } from "./auth.service";
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
  additionalCategoryIds?: string[];
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  available: boolean;
  active: boolean;
};

export type MenuCatalog = { categories: Category[]; products: Product[] };

export const fetchCategories = (
  signal?: AbortSignal
) =>
  apiRequest<Category[]>(
    "/categories",
    { signal }
  );

export const fetchProducts = (
  signal?: AbortSignal
) =>
  apiRequest<Product[]>(
    "/products",
    { signal }
  );

export const fetchProductsById = (
  id: string,
  signal?: AbortSignal
) =>
  apiRequest<Product>(
    `/products/${encodeURIComponent(id)}`,
    { signal }
  );

export type ProductPayload = {
  name: string;
  categoryId: string;
  additionalCategoryIds?: string[];
  description: string | null;
  price: number;
  stockQuantity: number;
  available: boolean;
};
export const createProduct = (data: ProductPayload) => apiRequest<Product>("/products", { method: "POST", headers: authHeaders(), body: JSON.stringify(data) });
export const updateProduct = (id: string, data: Partial<ProductPayload>) => apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(data) });
export const deleteProduct = (id: string) => apiRequest<void>(`/products/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() });
export const uploadProductImage = (id: string, file: File) => {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<Product>(`/products/${encodeURIComponent(id)}/image`, { method: "POST", headers: authHeaders(), body });
};
