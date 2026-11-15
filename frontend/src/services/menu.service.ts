import { apiRequest, assetUrl } from "@/api/client";
import type { AppliedPromotion, PromoFields } from "@/utils/promotion";

export type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
} & Partial<PromoFields>;

export type Product = {
  id: string;
  categoryId: string;
  additionalCategoryIds?: string[];
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  stockQuantity: number;
  /** false = produto sem controle de estoque: nunca esgota. */
  trackStock: boolean;
  available: boolean;
  active: boolean;
  /** Preço a cobrar agora, calculado pelo backend (com promoção vigente). */
  finalPrice: string;
  promotion: AppliedPromotion | null;
} & Partial<PromoFields>;

/** Preço unitário exibido; carrinhos antigos salvos sem finalPrice usam price. */
export const unitPrice = (product: Product) =>
  Number(product.finalPrice ?? product.price);

/** Limite por produto no carrinho; sem controle vale o máximo do pedido QR. */
export const stockLimit = (product: Product) =>
  product.trackStock ? Math.max(0, product.stockQuantity) : 99;

export const isSoldOut = (product: Product) =>
  product.trackStock && product.stockQuantity <= 0;

export type MenuCatalog = { categories: Category[]; products: Product[] };

export const fetchCategories = (signal?: AbortSignal) => apiRequest<Category[]>("/categories", { signal });
export type PromoInput = {
  promoType: PromoFields["promoType"];
  promoValue: number | null;
  promoActive: boolean;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
};
export type CategoryInput = {
  name: string;
  description: string | null;
  active: boolean;
} & Partial<PromoInput>;
export const saveCategory = (data: CategoryInput, id?: string) =>
  apiRequest<Category>(id ? `/categories/${id}` : "/categories", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(data),
  });
/** moveTo: categoria que recebe os produtos (inclusive inativos) da excluída. */
export const removeCategory = (id: string, moveTo?: string) =>
  apiRequest<void>(
    `/categories/${id}${moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : ""}`,
    { method: "DELETE" },
  );
const withImage = (product: Product): Product => ({
  ...product,
  imageUrl: assetUrl(product.imageUrl),
});

export const fetchProducts = (signal?: AbortSignal) =>
  apiRequest<Product[]>("/products", { signal }).then((products) =>
    products.map(withImage),
  );

export const fetchProductsById = (id: string, signal?: AbortSignal) =>
  apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { signal }).then(
    withImage,
  );

export type ProductInput = {
  name: string;
  description: string | null;
  price: number;
  stockQuantity?: number;
  trackStock: boolean;
  available: boolean;
  categoryId: string;
  additionalCategoryIds?: string[];
} & Partial<PromoInput>;
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
