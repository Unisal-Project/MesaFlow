import type { AppliedPromotion } from "../promotion.js";

export type ProductInput = {
  categoryId: bigint;
  additionalCategoryIds?: bigint[];
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  stockQuantity?: number;
  trackStock?: boolean;
  featured?: boolean;
  available?: boolean;
  active?: boolean;
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

export type ProductUpdateInput = {
  categoryId?: bigint;
  additionalCategoryIds?: bigint[];
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  /** Até 3 fotos, capa primeiro; grava as colunas image_url/_2/_3. */
  imageUrls?: string[];
  price?: number;
  stockQuantity?: number;
  trackStock?: boolean;
  featured?: boolean;
  available?: boolean;
  active?: boolean;
  promoType?: "PERCENT" | "AMOUNT" | null;
  promoValue?: number | null;
  promoActive?: boolean;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
};

export type ProductOutput = {
  id: bigint;
  categoryId: bigint | null;
  additionalCategoryIds?: bigint[];
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Fotos do produto (capa primeiro, sem vazios). */
  imageUrls: string[];
  /** Miniaturas na mesma ordem de imageUrls, derivadas sem coluna no banco. */
  thumbUrls: string[];
  price: string;
  stockQuantity: number;
  trackStock: boolean;
  featured: boolean;
  available: boolean;
  active: boolean;
  promoType: "PERCENT" | "AMOUNT" | null;
  promoValue: string | null;
  promoActive: boolean;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  /** Preço a cobrar agora (com promoção vigente). */
  finalPrice: string;
  promotion: AppliedPromotion | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductResponse = {
  id: string;
  categoryId: string | null;
  additionalCategoryIds: string[];
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Fotos do produto (capa primeiro, sem vazios). */
  imageUrls: string[];
  /** Miniaturas na mesma ordem de imageUrls, derivadas sem coluna no banco. */
  thumbUrls: string[];
  price: string;
  stockQuantity: number;
  trackStock: boolean;
  featured: boolean;
  available: boolean;
  active: boolean;
  promoType: "PERCENT" | "AMOUNT" | null;
  promoValue: string | null;
  promoActive: boolean;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  /** Preço a cobrar agora (com promoção vigente). */
  finalPrice: string;
  promotion: AppliedPromotion | null;
  createdAt: Date;
  updatedAt: Date;
};
