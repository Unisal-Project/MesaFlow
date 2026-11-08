import { apiRequest, assetUrl } from "@/api/client";

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
const withImage = (product: Product): Product => ({
  ...product,
  imageUrl: assetUrl(product.imageUrl),
});

export const fetchProducts = (signal?: AbortSignal) =>
  apiRequest<Product[]>("/products", { signal }).then((products) =>
    products.map(withImage),
  );

export type ProductInput = {
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  available: boolean;
  categoryId: string;
};
export const saveProduct = (data: Partial<ProductInput>, id?: string) =>
  apiRequest<Product>(id ? `/products/${id}` : "/products", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  }).then(withImage);
export const uploadProductImage = (id: string, file: File) => {
  const body = new FormData();
  body.append("image", file);
  return apiRequest<Product>(`/products/${id}/image`, {
    method: "POST",
    body,
  }).then(withImage);
};
export const removeProduct = (id: string) =>
  apiRequest<void>(`/products/${id}`, { method: "DELETE" });
