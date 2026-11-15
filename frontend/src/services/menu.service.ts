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
  /** Até 3 fotos, capa primeiro (imageUrl é a capa). */
  imageUrls?: string[];
  thumbUrls?: string[];
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
  imageUrls: product.imageUrls?.map((url) => assetUrl(url) ?? url),
  thumbUrls: product.thumbUrls?.map((url) => assetUrl(url) ?? url),
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
/**
 * Mesma promoção para vários produtos e categorias (tudo ou nada no backend).
 * Pausar: { productIds, categoryIds, promoActive: false } preserva os valores.
 */
export const applyPromotions = (
  data: { productIds: string[]; categoryIds: string[] } & (
    | PromoInput
    | { promoActive: false }
  ),
) =>
  apiRequest<{ products: number; categories: number }>("/promotions", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const saveProduct = (data: Partial<ProductInput>, id?: string) =>
  apiRequest<Product>(id ? `/products/${id}` : "/products", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  }).then(withImage);
/** slot 1 (padrão) = capa; 2 e 3 = extras (slot livre entra no fim). */
export const uploadProductImage = (id: string, file: File, slot = 1) => {
  const body = new FormData();
  body.append("image", file);
  return apiRequest<Product>(
    `/products/${id}/image${slot === 1 ? "" : `?slot=${slot}`}`,
    { method: "POST", body },
  ).then(withImage);
};
/** Remove a foto; as seguintes sobem (sem a capa, a 2ª vira capa). */
export const removeProductImage = (id: string, slot: number) =>
  apiRequest<Product>(`/products/${id}/image/${slot}`, {
    method: "DELETE",
  }).then(withImage);
/** Troca a foto do slot com a capa. */
export const setProductCover = (id: string, slot: number) =>
  apiRequest<Product>(`/products/${id}/image/${slot}/cover`, {
    method: "PATCH",
  }).then(withImage);
export const removeProduct = (id: string) =>
  apiRequest<void>(`/products/${id}`, { method: "DELETE" });
